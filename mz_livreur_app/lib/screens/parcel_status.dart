import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/storage.dart';

enum ParcelStatusAction { inTransit, delivered, rescheduled, returnPending }

class ParcelStatusScreen extends StatefulWidget {
  const ParcelStatusScreen({super.key, this.initialCode, this.initialData});

  final String? initialCode;
  final Map<String, dynamic>? initialData;

  @override
  State<ParcelStatusScreen> createState() => _ParcelStatusScreenState();
}

class _ParcelStatusScreenState extends State<ParcelStatusScreen> {
  final TextEditingController _reasonController = TextEditingController();

  bool _loading = true;
  bool _submitting = false;
  bool _messagePositive = false;
  String _message = "";
  String _code = "";
  Map<String, dynamic>? _colis;
  ParcelStatusAction? _selectedAction;
  ParcelStatusAction? _currentAction;

  @override
  void initState() {
    super.initState();
    _colis = widget.initialData;
    _code = _extractScanCode(
      widget.initialCode ??
          _colis?["barcode_value"]?.toString() ??
          _colis?["numero_suivi"]?.toString(),
    );
    if (_colis != null) {
      _currentAction = _currentActionFromData(_colis!);
    }
    Future.microtask(_loadCurrentState);
  }

  @override
  void dispose() {
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

  String? _apiAction(ParcelStatusAction? action) {
    switch (action) {
      case ParcelStatusAction.inTransit:
        return "in_transit";
      case ParcelStatusAction.delivered:
        return "delivered";
      case ParcelStatusAction.rescheduled:
        return "not_delivered";
      case ParcelStatusAction.returnPending:
        return "return_pending";
      case null:
        return null;
    }
  }

  String _actionLabel(ParcelStatusAction? action) {
    switch (action) {
      case ParcelStatusAction.inTransit:
        return "En transit";
      case ParcelStatusAction.delivered:
        return "Livre";
      case ParcelStatusAction.rescheduled:
        return "A relivrer";
      case ParcelStatusAction.returnPending:
        return "Retour expediteur";
      case null:
        return "";
    }
  }

  IconData _actionIcon(ParcelStatusAction action) {
    switch (action) {
      case ParcelStatusAction.inTransit:
        return Icons.local_shipping_outlined;
      case ParcelStatusAction.delivered:
        return Icons.task_alt_rounded;
      case ParcelStatusAction.rescheduled:
        return Icons.event_repeat_rounded;
      case ParcelStatusAction.returnPending:
        return Icons.assignment_return_rounded;
    }
  }

  ParcelStatusAction? _currentActionFromData(Map<String, dynamic> data) {
    final statut = (data["statut"]?.toString() ?? "").toLowerCase();
    final stage = (data["tracking_stage"]?.toString() ?? "").toLowerCase();
    final deliveredAt = data["delivered_at"]?.toString() ?? "";
    final returnedAt = data["returned_at"]?.toString() ?? "";
    final issueAt = data["last_delivery_issue_at"]?.toString() ?? "";

    if (returnedAt.isNotEmpty ||
        statut.contains("retour") ||
        stage == "return_pending" ||
        stage == "returned") {
      return ParcelStatusAction.returnPending;
    }

    if (statut.contains("relivr") ||
        (issueAt.isNotEmpty && stage == "at_warehouse")) {
      return ParcelStatusAction.rescheduled;
    }

    if (deliveredAt.isNotEmpty ||
        statut.contains("livr") ||
        stage == "delivered") {
      return ParcelStatusAction.delivered;
    }

    if (statut.contains("transit") || stage == "out_for_delivery") {
      return ParcelStatusAction.inTransit;
    }

    return null;
  }

  String _currentStateFromData(Map<String, dynamic> data) {
    final action = _currentActionFromData(data);
    final actionLabel = _actionLabel(action);
    if (actionLabel.isNotEmpty) return actionLabel;
    return _stageLabel(data["tracking_stage"]?.toString());
  }

  bool get _isTerminalState {
    final data = _colis;
    if (data == null) return false;
    final stage = (data["tracking_stage"]?.toString() ?? "").toLowerCase();
    final deliveredAt = data["delivered_at"]?.toString() ?? "";
    final returnedAt = data["returned_at"]?.toString() ?? "";
    return deliveredAt.isNotEmpty ||
        returnedAt.isNotEmpty ||
        stage == "delivered" ||
        stage == "returned";
  }

  bool get _isReturnLocked {
    final data = _colis;
    if (data == null) return false;
    final statut = (data["statut"]?.toString() ?? "").toLowerCase();
    final stage = (data["tracking_stage"]?.toString() ?? "").toLowerCase();
    return statut.contains("retour") || stage == "return_pending";
  }

  bool _canChooseAction(ParcelStatusAction action) {
    if (_loading || _submitting || _code.isEmpty || _colis == null) {
      return false;
    }
    if (_isTerminalState || _isReturnLocked) {
      return false;
    }
    return action != _currentAction;
  }

  Future<void> _loadCurrentState() async {
    if (_code.isEmpty) {
      setState(() {
        _loading = false;
        _messagePositive = false;
        _message = "Aucun code colis a ouvrir.";
      });
      return;
    }

    setState(() {
      _loading = true;
      _messagePositive = false;
      _message = "";
    });

    try {
      final data = await Api.postJson(
        "/courier/colis/scan/inspect",
        body: {"barcode_value": _code},
        withAuth: true,
      );
      if (!mounted) return;
      final current = _currentActionFromData(data);
      setState(() {
        _colis = data;
        _currentAction = current;
        _selectedAction = null;
        _messagePositive = false;
        _message = "";
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (await _redirectIfAuthError(e)) return;
      setState(() {
        _message = e.message;
        _messagePositive = false;
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _selectAction(ParcelStatusAction? action) {
    if (action == null) return;
    if (!_canChooseAction(action)) {
      setState(() {
        _message = action == _currentAction
            ? "Ce colis est deja: ${_actionLabel(action)}."
            : "Ce colis ne peut plus changer de statut depuis cette interface.";
        _messagePositive = false;
      });
      return;
    }

    setState(() {
      _selectedAction = action;
      _messagePositive = false;
      _message = "";
      if (action != ParcelStatusAction.rescheduled &&
          action != ParcelStatusAction.returnPending) {
        _reasonController.clear();
      }
    });
  }

  Future<void> _submitAction() async {
    final action = _apiAction(_selectedAction);
    if (_code.isEmpty || action == null || _submitting || _loading) {
      return;
    }

    if (_selectedAction == _currentAction) {
      setState(() {
        _message = "Ce colis est deja: ${_actionLabel(_selectedAction)}.";
        _messagePositive = false;
      });
      return;
    }

    final reason = _reasonController.text.trim();
    if ((_selectedAction == ParcelStatusAction.rescheduled ||
            _selectedAction == ParcelStatusAction.returnPending) &&
        reason.length < 3) {
      setState(() {
        _message = "Le motif doit contenir au moins 3 caracteres.";
        _messagePositive = false;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _messagePositive = false;
      _message = "";
    });

    try {
      final body = <String, dynamic>{"barcode_value": _code, "action": action};
      if (_selectedAction == ParcelStatusAction.rescheduled ||
          _selectedAction == ParcelStatusAction.returnPending) {
        body["reason"] = reason;
      }

      final data = await Api.postJson(
        "/courier/colis/scan/action",
        body: body,
        withAuth: true,
      );
      if (!mounted) return;
      setState(() {
        _colis = data;
        _currentAction = _currentActionFromData(data);
        _selectedAction = null;
        _reasonController.clear();
        _message = data["detail"]?.toString() ?? "Statut mis a jour.";
        _messagePositive = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (await _redirectIfAuthError(e)) return;
      setState(() {
        _message = e.message;
        _messagePositive = false;
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<bool> _redirectIfAuthError(ApiException error) async {
    if (error.statusCode != 401 && error.statusCode != 403) {
      return false;
    }

    await Storage.clearToken();
    if (!mounted) return true;
    Navigator.pushNamedAndRemoveUntil(
      context,
      "/login",
      (_) => false,
      arguments: error.message,
    );
    return true;
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

  List<_DetailLine> _detailLines(Map<String, dynamic> colis) {
    return [
      _DetailLine("Destinataire", colis["nom_destinataire"]?.toString() ?? "-"),
      _DetailLine(
        "Telephone",
        colis["telephone_destinataire"]?.toString() ?? "-",
      ),
      _DetailLine("Adresse", colis["adresse_livraison"]?.toString() ?? "-"),
      _DetailLine("Code QR", colis["barcode_value"]?.toString() ?? _code),
      _DetailLine("Statut", _statusLabel(colis["statut"]?.toString())),
      _DetailLine("Etape", _stageLabel(colis["tracking_stage"]?.toString())),
      if ((colis["tournee_nom"]?.toString() ?? "").isNotEmpty)
        _DetailLine("Tournee", colis["tournee_nom"].toString()),
      if ((colis["ordre"]?.toString() ?? "").isNotEmpty)
        _DetailLine("Ordre", colis["ordre"].toString()),
      if ((colis["poids"]?.toString() ?? "").isNotEmpty)
        _DetailLine("Poids", "${colis["poids"]} kg"),
      _DetailLine(
        "Tentatives",
        colis["delivery_issue_count"]?.toString() ?? "0",
      ),
      if ((colis["last_delivery_issue_reason"]?.toString() ?? "").isNotEmpty)
        _DetailLine(
          "Dernier motif",
          colis["last_delivery_issue_reason"].toString(),
        ),
      if ((colis["out_for_delivery_at"]?.toString() ?? "").isNotEmpty)
        _DetailLine(
          "En transit le",
          _formatDateTime(colis["out_for_delivery_at"]?.toString()),
        ),
      if ((colis["delivered_at"]?.toString() ?? "").isNotEmpty)
        _DetailLine(
          "Livre le",
          _formatDateTime(colis["delivered_at"]?.toString()),
        ),
      if ((colis["returned_at"]?.toString() ?? "").isNotEmpty)
        _DetailLine(
          "Retour le",
          _formatDateTime(colis["returned_at"]?.toString()),
        ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final colis = _colis;
    final currentLabel = colis == null ? "" : _currentStateFromData(colis);
    final needsReason =
        _selectedAction == ParcelStatusAction.rescheduled ||
        _selectedAction == ParcelStatusAction.returnPending;
    final canSubmit =
        _selectedAction != null &&
        !_loading &&
        !_submitting &&
        _canChooseAction(_selectedAction!);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Statut colis"),
        actions: [
          IconButton(
            onPressed: _loading || _submitting ? null : _loadCurrentState,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
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
              child: _loading && colis == null
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: colors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(15),
                              ),
                              child: Icon(
                                Icons.inventory_2_outlined,
                                color: colors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    colis?["numero_suivi"]?.toString() ?? _code,
                                    style: TextStyle(
                                      color: colors.onSurface,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Text(
                                    currentLabel.isEmpty
                                        ? "Etat en chargement"
                                        : "Etat actuel: $currentLabel",
                                    style: TextStyle(
                                      color: theme.textTheme.bodySmall?.color,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (colis != null) ...[
                          const SizedBox(height: 18),
                          ..._detailLines(colis).map(
                            (line) => _ResultRow(
                              label: line.label,
                              value: line.value,
                            ),
                          ),
                        ],
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
                    "Changer le statut",
                    style: TextStyle(
                      color: colors.onSurface,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isTerminalState
                        ? "Ce colis est termine, aucune nouvelle action n est disponible."
                        : _isReturnLocked
                        ? "Ce colis est deja dans le flux retour expediteur."
                        : "Choisis une action differente de l etat actuel.",
                    style: TextStyle(color: theme.textTheme.bodySmall?.color),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<ParcelStatusAction>(
                    key: ValueKey(_selectedAction),
                    initialValue: _selectedAction,
                    decoration: const InputDecoration(
                      labelText: "Action",
                      prefixIcon: Icon(Icons.tune_rounded),
                    ),
                    items: ParcelStatusAction.values.map((action) {
                      final isCurrent = action == _currentAction;
                      final enabled = _canChooseAction(action);

                      return DropdownMenuItem<ParcelStatusAction>(
                        value: action,
                        enabled: enabled,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 260),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _actionIcon(action),
                                size: 20,
                                color: enabled ? colors.primary : theme.disabledColor,
                              ),
                              const SizedBox(width: 10),
                              Flexible(
                                child: Text(
                                  isCurrent
                                      ? "${_actionLabel(action)} - etat actuel"
                                      : _actionLabel(action),
                                  overflow: TextOverflow.ellipsis,
                                  softWrap: false,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: _loading || _submitting ? null : _selectAction,
                  ),
                  if (needsReason) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _reasonController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        labelText:
                            _selectedAction == ParcelStatusAction.rescheduled
                            ? "Motif a relivrer"
                            : "Motif retour expediteur",
                        hintText:
                            _selectedAction == ParcelStatusAction.rescheduled
                            ? "Ex: client absent, adresse fermee, appel sans reponse..."
                            : "Ex: colis refuse, retour demande par l expediteur...",
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
                            : _selectedAction == null
                            ? "Selectionner une action"
                            : "Enregistrer: ${_actionLabel(_selectedAction)}",
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_message.isNotEmpty) ...[
              const SizedBox(height: 16),
              _MessageBox(message: _message, positive: _messagePositive),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailLine {
  const _DetailLine(this.label, this.value);

  final String label;
  final String value;
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

class _MessageBox extends StatelessWidget {
  const _MessageBox({required this.message, required this.positive});

  final String message;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = positive
        ? (isDark ? const Color(0xFF173025) : const Color(0xFFEAF8EF))
        : const Color(0xFFFFF1F1);
    final border = positive
        ? (isDark ? const Color(0xFF24523C) : const Color(0xFFCDE9D7))
        : const Color(0xFFFFD1D1);
    final text = positive ? const Color(0xFF2E8F5B) : const Color(0xFFB44A4A);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Text(
        message,
        style: TextStyle(color: text, fontWeight: FontWeight.w800),
      ),
    );
  }
}
