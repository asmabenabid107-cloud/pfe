import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../core/api.dart';

enum ParcelScanAction { inTransit, delivered, rescheduled, returnPending }

class ParcelScanScreen extends StatefulWidget {
  const ParcelScanScreen({super.key, this.initialCode});

  final String? initialCode;

  @override
  State<ParcelScanScreen> createState() => _ParcelScanScreenState();
}

class _ParcelScanScreenState extends State<ParcelScanScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  final TextEditingController _manualController = TextEditingController();
  final TextEditingController _reasonController = TextEditingController();
  Timer? _manualInspectTimer;

  bool _submitting = false;
  bool _scanEnabled = true;
  bool _loadingCurrentState = false;
  bool _torchEnabled = false;
  String _message = "";
  String _currentStateLabel = "";
  String _currentStateCode = "";
  String _loadingStateCode = "";
  Map<String, dynamic>? _result;
  ParcelScanAction? _selectedAction;
  ParcelScanAction? _currentAction;

  @override
  void initState() {
    super.initState();
    final initialCode = _extractScanCode(widget.initialCode);
    if (initialCode.isNotEmpty) {
      _manualController.text = initialCode;
      _scanEnabled = false;
      _message = "QR lu. Choisis l action a enregistrer.";
      Future.microtask(() async {
        await _scannerController.stop();
        await _loadCurrentState(initialCode);
      });
    }
  }

  @override
  void dispose() {
    _manualInspectTimer?.cancel();
    _scannerController.dispose();
    _manualController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  String _extractScanCode(String? rawValue) {
    final raw = (rawValue ?? "").trim();
    if (raw.isEmpty) return "";

    final uri = Uri.tryParse(raw);
    if (uri != null && uri.queryParameters.isNotEmpty) {
      for (final key in const [
        "code",
        "barcode",
        "barcode_value",
        "numero_suivi",
      ]) {
        final value = uri.queryParameters[key]?.trim();
        if (value != null && value.isNotEmpty) {
          return value;
        }
      }
    }

    return raw;
  }

  String get _actionTitle {
    switch (_selectedAction) {
      case ParcelScanAction.inTransit:
        return "En transit";
      case ParcelScanAction.delivered:
        return "Livre";
      case ParcelScanAction.rescheduled:
        return "A relivrer";
      case ParcelScanAction.returnPending:
        return "Retour expediteur";
      case null:
        return "Choisir une action";
    }
  }

  String? get _apiAction {
    switch (_selectedAction) {
      case ParcelScanAction.inTransit:
        return "in_transit";
      case ParcelScanAction.delivered:
        return "delivered";
      case ParcelScanAction.rescheduled:
        return "not_delivered";
      case ParcelScanAction.returnPending:
        return "return_pending";
      case null:
        return null;
    }
  }

  ParcelScanAction? _currentActionFromData(Map<String, dynamic> data) {
    final statut = (data["statut"]?.toString() ?? "").toLowerCase();
    final stage = (data["tracking_stage"]?.toString() ?? "").toLowerCase();
    final deliveredAt = data["delivered_at"]?.toString() ?? "";
    final returnedAt = data["returned_at"]?.toString() ?? "";
    final issueAt = data["last_delivery_issue_at"]?.toString() ?? "";

    if (returnedAt.isNotEmpty ||
        statut.contains("retour") ||
        stage == "return_pending" ||
        stage == "returned") {
      return ParcelScanAction.returnPending;
    }

    if (statut.contains("relivr") ||
        (issueAt.isNotEmpty && stage == "at_warehouse")) {
      return ParcelScanAction.rescheduled;
    }

    if (deliveredAt.isNotEmpty ||
        statut.contains("livr") ||
        stage == "delivered") {
      return ParcelScanAction.delivered;
    }

    if (stage == "out_for_delivery") {
      return ParcelScanAction.inTransit;
    }

    return null;
  }

  String _actionLabel(ParcelScanAction? action) {
    switch (action) {
      case ParcelScanAction.inTransit:
        return "En transit";
      case ParcelScanAction.delivered:
        return "Livre";
      case ParcelScanAction.rescheduled:
        return "A relivrer";
      case ParcelScanAction.returnPending:
        return "Retour expediteur";
      case null:
        return "";
    }
  }

  String _currentStateFromData(Map<String, dynamic> data) {
    final action = _currentActionFromData(data);
    final actionLabel = _actionLabel(action);
    if (actionLabel.isNotEmpty) return actionLabel;
    return _stageLabel(data["tracking_stage"]?.toString());
  }

  bool _isCurrentAction(ParcelScanAction action) => _currentAction == action;

  bool _isCompleteManualCode(String code) => RegExp(r'^\d{12}$').hasMatch(code);

  void _clearCurrentStateForInput() {
    _message = "";
    _result = null;
    _currentAction = null;
    _currentStateLabel = "";
    _currentStateCode = "";
    _selectedAction = null;
  }

  void _handleManualCodeChanged(String value) {
    final code = _extractScanCode(value);
    _manualInspectTimer?.cancel();

    setState(_clearCurrentStateForInput);

    if (!_isCompleteManualCode(code)) {
      return;
    }

    _manualInspectTimer = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      final latestCode = _extractScanCode(_manualController.text);
      if (latestCode == code) {
        _loadCurrentState(code);
      }
    });
  }

  void _selectAction(ParcelScanAction action) {
    if (_isCurrentAction(action)) {
      setState(() {
        _message = "Ce colis est deja: ${_actionLabel(action)}.";
        _result = null;
      });
      return;
    }

    setState(() {
      _selectedAction = action;
      _message = "";
      _result = null;
      if (action != ParcelScanAction.rescheduled &&
          action != ParcelScanAction.returnPending) {
        _reasonController.clear();
      }
    });
  }

  Future<void> _captureCode(String rawValue) async {
    if (!_scanEnabled || _submitting) return;

    final code = _extractScanCode(rawValue);
    if (code.isEmpty) return;

    _manualInspectTimer?.cancel();
    await _scannerController.stop();
    if (!mounted) return;

    setState(() {
      _scanEnabled = false;
      _manualController.text = code;
      _message = "QR lu. Verification de l etat actuel...";
      _result = null;
      _currentAction = null;
      _currentStateLabel = "";
      _currentStateCode = "";
    });
    await _loadCurrentState(code);
  }

  Future<void> _loadCurrentState(String rawCode) async {
    final code = _extractScanCode(rawCode);
    if (code.isEmpty) return;
    if (_loadingCurrentState && _loadingStateCode == code) return;

    _manualInspectTimer?.cancel();
    setState(() {
      _loadingCurrentState = true;
      _loadingStateCode = code;
      _message = "Verification de l etat actuel...";
      _result = null;
      _currentAction = null;
      _currentStateLabel = "";
      _currentStateCode = "";
      if (_selectedAction != null) {
        _selectedAction = null;
      }
    });

    try {
      final data = await Api.postJson(
        "/courier/colis/scan/inspect",
        body: {"barcode_value": code},
        withAuth: true,
      );

      if (!mounted) return;
      if (_extractScanCode(_manualController.text) != code) return;
      final currentAction = _currentActionFromData(data);
      final currentLabel = _currentStateFromData(data);
      setState(() {
        _currentAction = currentAction;
        _currentStateLabel = currentLabel;
        _currentStateCode = code;
        _message = currentAction == null
            ? "Etat actuel: $currentLabel. Choisis une action."
            : "Etat actuel: $currentLabel. Cette action est desactivee.";
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (_extractScanCode(_manualController.text) != code) return;
      setState(() {
        _message = e.message;
        _currentStateCode = "";
      });
    } finally {
      if (mounted && _loadingStateCode == code) {
        setState(() {
          _loadingCurrentState = false;
          _loadingStateCode = "";
        });
      }
    }
  }

  Future<void> _submitAction() async {
    final code = _extractScanCode(_manualController.text);
    final action = _apiAction;

    if (code.isEmpty || _submitting || _loadingCurrentState) {
      return;
    }

    if (action == null) {
      setState(() {
        _message =
            "Choisis En transit, Livre, A relivrer ou Retour expediteur avant d enregistrer.";
        _result = null;
      });
      return;
    }

    if (_selectedAction != null && _isCurrentAction(_selectedAction!)) {
      setState(() {
        _message = "Ce colis est deja: ${_actionLabel(_selectedAction)}.";
        _result = null;
      });
      return;
    }

    final reason = _reasonController.text.trim();
    if ((_selectedAction == ParcelScanAction.rescheduled ||
            _selectedAction == ParcelScanAction.returnPending) &&
        reason.length < 3) {
      setState(() {
        _message = "Le motif doit contenir au moins 3 caracteres.";
        _result = null;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _message = "";
      _result = null;
      _manualController.text = code;
    });

    try {
      final body = <String, dynamic>{"barcode_value": code, "action": action};
      if (_selectedAction == ParcelScanAction.rescheduled ||
          _selectedAction == ParcelScanAction.returnPending) {
        body["reason"] = reason;
      }

      final data = await Api.postJson(
        "/courier/colis/scan/action",
        body: body,
        withAuth: true,
      );

      if (!mounted) return;
      final currentAction = _currentActionFromData(data);
      setState(() {
        _result = data;
        _currentAction = currentAction;
        _currentStateLabel = _currentStateFromData(data);
        _currentStateCode = code;
        _message = data["detail"]?.toString() ?? "Operation reussie";
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _message = e.message);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _scanAgain() async {
    _manualInspectTimer?.cancel();
    await _scannerController.start();
    if (!mounted) return;
    setState(() {
      _scanEnabled = true;
      _message = "";
      _result = null;
      _selectedAction = null;
      _currentAction = null;
      _currentStateLabel = "";
      _currentStateCode = "";
      _loadingStateCode = "";
      _manualController.clear();
      _reasonController.clear();
    });
  }

  String _statusLabel(String? status) {
    final raw = (status ?? "").toLowerCase();
    if (raw.contains("relivr") || raw.contains("report")) return "A relivrer";
    if (raw.contains("transit")) return "En transit";
    if (raw.contains("livr")) return "Livre";
    if (raw.contains("retour")) return "Retour";
    if (raw.contains("annul")) return "Annule";
    return "En attente";
  }

  String _stageLabel(String? stage) {
    final raw = (stage ?? "").toLowerCase();
    if (raw == "return_pending") {
      return "Depot retour expediteur";
    }
    if (raw == "returned") {
      return "Retour expediteur confirme";
    }
    if (raw.contains("return")) {
      return "Retour expediteur";
    }
    if (raw == "picked_up" || raw.contains("picked")) {
      return "Recupere chez expediteur";
    }
    if (raw == "out_for_delivery" ||
        (raw.contains("out") && raw.contains("delivery"))) {
      return "En transit";
    }
    if (raw == "at_warehouse" || raw.contains("warehouse")) {
      return "Au depot";
    }
    if (raw == "delivered" || raw.contains("deliver")) {
      return "Arrive a destination";
    }
    return "En attente";
  }

  String _formatDateTime(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "-";
    }
    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      return value;
    }
    final local = parsed.toLocal();
    String twoDigits(int input) => input.toString().padLeft(2, "0");
    return "${twoDigits(local.day)}/${twoDigits(local.month)}/${local.year} "
        "${twoDigits(local.hour)}:${twoDigits(local.minute)}";
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final currentCode = _extractScanCode(_manualController.text);
    final hasCode = currentCode.isNotEmpty;
    final isManualCodeComplete = _isCompleteManualCode(currentCode);
    final hasCheckedCurrentState =
        hasCode &&
        _currentStateCode == currentCode &&
        _currentStateLabel.isNotEmpty;
    final canSubmit =
        hasCode &&
        hasCheckedCurrentState &&
        _selectedAction != null &&
        !_submitting &&
        !_loadingCurrentState &&
        _selectedAction != _currentAction;

    return Scaffold(
      appBar: AppBar(title: const Text("Scanner colis")),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: theme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Scan unique",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Scanne le QR du bon de livraison, puis choisis l action a appliquer au colis.",
                    style: TextStyle(color: theme.textTheme.bodySmall?.color),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: theme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: colors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(
                          Icons.qr_code_scanner_rounded,
                          color: colors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Scanner le QR",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: colors.onSurface,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () async {
                          final next = !_torchEnabled;
                          await _scannerController.toggleTorch();
                          if (!mounted) return;
                          setState(() => _torchEnabled = next);
                        },
                        icon: Icon(
                          _torchEnabled
                              ? Icons.flash_on_rounded
                              : Icons.flash_off_rounded,
                          color: colors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: SizedBox(
                      height: 280,
                      child: Stack(
                        children: [
                          MobileScanner(
                            controller: _scannerController,
                            onDetect: (capture) {
                              final raw = capture.barcodes.isNotEmpty
                                  ? capture.barcodes.first.rawValue ?? ""
                                  : "";
                              _captureCode(raw);
                            },
                          ),
                          Positioned.fill(
                            child: IgnorePointer(
                              child: Container(
                                margin: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.75),
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          if (!_scanEnabled)
                            Positioned.fill(
                              child: Container(
                                color: Colors.black.withValues(alpha: 0.58),
                                alignment: Alignment.center,
                                padding: const EdgeInsets.all(18),
                                child: const Text(
                                  "QR lu",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _manualController,
                    decoration: const InputDecoration(
                      labelText: "QR ou code colis",
                      hintText: "Scanner ou saisir le code",
                      prefixIcon: Icon(Icons.qr_code_2_rounded),
                    ),
                    textInputAction: TextInputAction.done,
                    keyboardType: TextInputType.number,
                    onChanged: _handleManualCodeChanged,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _scanAgain,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text("Scanner un autre QR"),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: theme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Action livreur",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _currentStateLabel.isNotEmpty
                        ? "Etat actuel: $_currentStateLabel"
                        : _loadingCurrentState
                        ? "Verification automatique de l etat actuel..."
                        : hasCode
                        ? isManualCodeComplete
                              ? "Verification automatique en cours..."
                              : "Saisis les 12 chiffres du QR pour verifier automatiquement."
                        : "Scanne le QR avant d enregistrer une action.",
                    style: TextStyle(color: theme.textTheme.bodySmall?.color),
                  ),
                  const SizedBox(height: 14),
                  _ActionTile(
                    icon: Icons.local_shipping_outlined,
                    title: "En transit",
                    subtitle: _isCurrentAction(ParcelScanAction.inTransit)
                        ? "Etat actuel du colis."
                        : "Le colis est en route vers le destinataire.",
                    selected: _selectedAction == ParcelScanAction.inTransit,
                    onTap:
                        hasCode &&
                            hasCheckedCurrentState &&
                            !_loadingCurrentState &&
                            !_isCurrentAction(ParcelScanAction.inTransit)
                        ? () => _selectAction(ParcelScanAction.inTransit)
                        : null,
                  ),
                  const SizedBox(height: 10),
                  _ActionTile(
                    icon: Icons.task_alt_rounded,
                    title: "Livre",
                    subtitle: _isCurrentAction(ParcelScanAction.delivered)
                        ? "Etat actuel du colis."
                        : "Le colis a ete remis au client final.",
                    selected: _selectedAction == ParcelScanAction.delivered,
                    onTap:
                        hasCode &&
                            hasCheckedCurrentState &&
                            !_loadingCurrentState &&
                            !_isCurrentAction(ParcelScanAction.delivered)
                        ? () => _selectAction(ParcelScanAction.delivered)
                        : null,
                  ),
                  const SizedBox(height: 10),
                  _ActionTile(
                    icon: Icons.event_repeat_rounded,
                    title: "A relivrer",
                    subtitle: _isCurrentAction(ParcelScanAction.rescheduled)
                        ? "Etat actuel du colis."
                        : "Le colis revient au depot aujourd hui et sera repris demain.",
                    selected: _selectedAction == ParcelScanAction.rescheduled,
                    onTap:
                        hasCode &&
                            hasCheckedCurrentState &&
                            !_loadingCurrentState &&
                            !_isCurrentAction(ParcelScanAction.rescheduled)
                        ? () => _selectAction(ParcelScanAction.rescheduled)
                        : null,
                  ),
                  const SizedBox(height: 10),
                  _ActionTile(
                    icon: Icons.assignment_return_rounded,
                    title: "Retour expediteur",
                    subtitle: _isCurrentAction(ParcelScanAction.returnPending)
                        ? "Etat actuel du colis."
                        : "Le colis est depose au depot pour etre renvoye a l expediteur.",
                    selected: _selectedAction == ParcelScanAction.returnPending,
                    onTap:
                        hasCode &&
                            hasCheckedCurrentState &&
                            !_loadingCurrentState &&
                            !_isCurrentAction(ParcelScanAction.returnPending)
                        ? () => _selectAction(ParcelScanAction.returnPending)
                        : null,
                  ),
                  if (_selectedAction == ParcelScanAction.rescheduled ||
                      _selectedAction == ParcelScanAction.returnPending) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _reasonController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        labelText:
                            _selectedAction == ParcelScanAction.rescheduled
                            ? "Motif"
                            : "Motif retour expediteur",
                        hintText:
                            _selectedAction == ParcelScanAction.rescheduled
                            ? "Ex: client absent, adresse fermee, appel sans reponse..."
                            : "Ex: retour demande par l expediteur, colis refuse...",
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: canSubmit ? _submitAction : null,
                      icon: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_rounded),
                      label: Text(
                        _submitting
                            ? "Enregistrement..."
                            : "Enregistrer: $_actionTitle",
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_message.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _result == null
                      ? const Color(0xFFFFF1F1)
                      : (isDark
                            ? const Color(0xFF173025)
                            : const Color(0xFFEAF8EF)),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: _result == null
                        ? const Color(0xFFFFD1D1)
                        : (isDark
                              ? const Color(0xFF24523C)
                              : const Color(0xFFCDE9D7)),
                  ),
                ),
                child: Text(
                  _message,
                  style: TextStyle(
                    color: _result == null
                        ? const Color(0xFFB44A4A)
                        : const Color(0xFF2E8F5B),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
            if (_result != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: theme.dividerColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Derniere operation",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: colors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _ResultRow(
                      label: "Numero suivi",
                      value: _result?["numero_suivi"]?.toString() ?? "-",
                    ),
                    _ResultRow(
                      label: "Code QR",
                      value: _result?["barcode_value"]?.toString() ?? "-",
                    ),
                    _ResultRow(label: "Action", value: _actionTitle),
                    _ResultRow(
                      label: "Statut",
                      value: _statusLabel(_result?["statut"]?.toString()),
                    ),
                    _ResultRow(
                      label: "Etape",
                      value: _stageLabel(
                        _result?["tracking_stage"]?.toString(),
                      ),
                    ),
                    if ((_result?["delivery_issue_count"]?.toString() ?? "")
                        .isNotEmpty)
                      _ResultRow(
                        label: "Tentatives reportees",
                        value:
                            _result?["delivery_issue_count"]?.toString() ?? "0",
                      ),
                    if ((_result?["last_delivery_issue_reason"]?.toString() ??
                            "")
                        .isNotEmpty)
                      _ResultRow(
                        label: "Motif",
                        value:
                            _result?["last_delivery_issue_reason"]
                                ?.toString() ??
                            "-",
                      ),
                    if ((_result?["out_for_delivery_at"]?.toString() ?? "")
                        .isNotEmpty)
                      _ResultRow(
                        label: "En transit le",
                        value: _formatDateTime(
                          _result?["out_for_delivery_at"]?.toString(),
                        ),
                      ),
                    if ((_result?["delivered_at"]?.toString() ?? "").isNotEmpty)
                      _ResultRow(
                        label: "Livre le",
                        value: _formatDateTime(
                          _result?["delivered_at"]?.toString(),
                        ),
                      ),
                    if ((_result?["returned_at"]?.toString() ?? "").isNotEmpty)
                      _ResultRow(
                        label: "Retour le",
                        value: _formatDateTime(
                          _result?["returned_at"]?.toString(),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final enabled = onTap != null;
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: isDark ? 0.18 : 0.10)
                : theme.cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? colors.primary : theme.dividerColor,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: colors.primary.withValues(
                    alpha: enabled ? 0.12 : 0.06,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: enabled ? colors.primary : theme.disabledColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: enabled ? colors.onSurface : theme.disabledColor,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: enabled
                            ? theme.textTheme.bodySmall?.color
                            : theme.disabledColor,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? colors.primary : theme.disabledColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 112,
            child: Text(
              label,
              style: TextStyle(
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: colors.onSurface,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
