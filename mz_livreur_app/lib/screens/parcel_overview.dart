import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../core/api.dart';

enum ParcelOverviewMode { notDelivered, returned }

class ParcelOverviewScreen extends StatefulWidget {
  const ParcelOverviewScreen({super.key, required this.mode});

  final ParcelOverviewMode mode;

  @override
  State<ParcelOverviewScreen> createState() => _ParcelOverviewScreenState();
}

class _ParcelOverviewScreenState extends State<ParcelOverviewScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  final TextEditingController _manualReturnController = TextEditingController();

  bool _loading = true;
  bool _submitting = false;
  bool _scanEnabled = true;
  bool _torchEnabled = false;
  String _message = "";
  bool _messageIsError = false;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _manualReturnController.dispose();
    super.dispose();
  }

  String get _title {
    switch (widget.mode) {
      case ParcelOverviewMode.notDelivered:
        return "Colis a relivrer";
      case ParcelOverviewMode.returned:
        return "Retours expediteur";
    }
  }

  String get _subtitle {
    switch (widget.mode) {
      case ParcelOverviewMode.notDelivered:
        return "Les colis revenus au depot pour etre repris demain en livraison.";
      case ParcelOverviewMode.returned:
        return "Les colis deposes au depot pour retour expediteur, ou ceux deja retournes.";
    }
  }

  String get _endpoint {
    switch (widget.mode) {
      case ParcelOverviewMode.notDelivered:
        return "/courier/colis/not-delivered";
      case ParcelOverviewMode.returned:
        return "/courier/colis/returned";
    }
  }

  List<String> get _fallbackEndpoints {
    switch (widget.mode) {
      case ParcelOverviewMode.notDelivered:
        return [_endpoint, "/courier/colis/undelivered"];
      case ParcelOverviewMode.returned:
        return [_endpoint];
    }
  }

  String get _emptyMessage {
    switch (widget.mode) {
      case ParcelOverviewMode.notDelivered:
        return "Aucun colis a relivrer pour le moment.";
      case ParcelOverviewMode.returned:
        return "Aucun colis dans le flux retour expediteur.";
    }
  }

  Future<void> _loadItems() async {
    setState(() {
      _loading = true;
      _message = "";
      _messageIsError = false;
    });

    try {
      Map<String, dynamic>? data;
      ApiException? lastError;

      for (final endpoint in _fallbackEndpoints) {
        try {
          data = await Api.getJson(endpoint, withAuth: true);
          break;
        } on ApiException catch (e) {
          lastError = e;
          final canFallback =
              e.statusCode == 404 && endpoint != _fallbackEndpoints.last;
          if (!canFallback) {
            rethrow;
          }
        }
      }

      if (data == null) {
        throw lastError ??
            ApiException(500, "Impossible de charger les colis.");
      }

      final rawItems = data["data"];
      final items = rawItems is List
          ? rawItems
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .toList()
          : <Map<String, dynamic>>[];

      if (!mounted) return;
      setState(() {
        _items = items;
        _message = "";
        _messageIsError = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _message = e.message;
        _messageIsError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  bool _canReportUndelivered(Map<String, dynamic> item) {
    final trackingStage =
        item["tracking_stage"]?.toString().toLowerCase() ?? "";
    final deliveredAt = item["delivered_at"]?.toString() ?? "";
    final returnedAt = item["returned_at"]?.toString() ?? "";
    return trackingStage == "out_for_delivery" &&
        deliveredAt.isEmpty &&
        returnedAt.isEmpty;
  }

  bool _canConfirmReturn(Map<String, dynamic> item) {
    final trackingStage =
        item["tracking_stage"]?.toString().toLowerCase() ?? "";
    final returnedAt = item["returned_at"]?.toString() ?? "";
    return trackingStage == "return_pending" && returnedAt.isEmpty;
  }

  String _stageLabel(String? stage) {
    final raw = (stage ?? "").toLowerCase();
    if (raw == "return_pending") return "Depot retour expediteur";
    if (raw == "returned") return "Retour expediteur";
    if (raw == "out_for_delivery" ||
        (raw.contains("out") && raw.contains("delivery"))) {
      return "Sorti du depot";
    }
    if (raw == "at_warehouse" || raw.contains("warehouse")) {
      return "Au depot";
    }
    if (raw == "picked_up" || raw.contains("picked")) {
      return "Recupere chez expediteur";
    }
    if (raw == "delivered" || raw.contains("deliver")) {
      return "Livre";
    }
    return "En attente";
  }

  String _statusLabel(String? status) {
    final raw = (status ?? "").toLowerCase();
    if (raw.contains("relivr") || raw.contains("report")) return "A relivrer";
    if (raw.contains("livr")) return "Livre";
    if (raw.contains("retour")) return "Retour";
    if (raw.contains("transit")) return "En transit";
    if (raw.contains("annul")) return "Annule";
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

  Future<void> _openReasonDialog(Map<String, dynamic> colis) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        String? localError;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text("Motif a relivrer"),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    colis["numero_suivi"]?.toString() ?? "-",
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: controller,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: "Motif",
                      hintText:
                          "Ex: client absent, immeuble ferme, appel sans reponse...",
                    ),
                  ),
                  if (localError != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      localError!,
                      style: const TextStyle(
                        color: Color(0xFFB44A4A),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text("Annuler"),
                ),
                FilledButton(
                  onPressed: () {
                    final value = controller.text.trim();
                    if (value.length < 3) {
                      setDialogState(() {
                        localError =
                            "Le motif doit contenir au moins 3 caracteres.";
                      });
                      return;
                    }
                    Navigator.of(dialogContext).pop(value);
                  },
                  child: const Text("Enregistrer"),
                ),
              ],
            );
          },
        );
      },
    );
    controller.dispose();

    if (reason == null || reason.trim().isEmpty) {
      return;
    }

    await _markAsRescheduled(colis, reason);
  }

  Future<void> _markAsRescheduled(
    Map<String, dynamic> colis,
    String reason,
  ) async {
    final colisId = int.tryParse(colis["id"]?.toString() ?? "");
    if (colisId == null || _submitting) {
      return;
    }

    setState(() {
      _submitting = true;
      _message = "";
      _messageIsError = false;
    });

    try {
      final data = await Api.postJson(
        "/courier/colis/$colisId/undelivered",
        body: {"reason": reason.trim()},
        withAuth: true,
      );
      if (!mounted) return;
      setState(() {
        _message = data["detail"]?.toString() ?? "Motif enregistre";
        _messageIsError = false;
      });
      await _loadItems();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _message = e.message;
        _messageIsError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _confirmReturnFromList(Map<String, dynamic> colis) async {
    final colisId = int.tryParse(colis["id"]?.toString() ?? "");
    if (colisId == null || _submitting) {
      return;
    }

    setState(() {
      _submitting = true;
      _message = "";
      _messageIsError = false;
    });

    try {
      final data = await Api.postJson(
        "/courier/colis/$colisId/confirm-return",
        body: const <String, dynamic>{},
        withAuth: true,
      );
      if (!mounted) return;
      setState(() {
        _message = data["detail"]?.toString() ?? "Retour confirme";
        _messageIsError = false;
      });
      await _loadItems();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _message = e.message;
        _messageIsError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _submitReturnByCode(String rawCode) async {
    final barcode = rawCode.trim();
    if (barcode.isEmpty || _submitting) {
      return;
    }

    await _scannerController.stop();

    setState(() {
      _submitting = true;
      _message = "";
      _messageIsError = false;
      _scanEnabled = false;
      _manualReturnController.text = barcode;
    });

    try {
      final data = await Api.postJson(
        "/courier/colis/scan/return-shipper",
        body: {"barcode_value": barcode},
        withAuth: true,
      );
      if (!mounted) return;
      setState(() {
        _message = data["detail"]?.toString() ?? "Retour confirme";
        _messageIsError = false;
      });
      await _loadItems();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _message = e.message;
        _messageIsError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _scanAgain() async {
    await _scannerController.start();
    if (!mounted) return;
    setState(() {
      _scanEnabled = true;
      _message = "";
    });
  }

  Widget _buildReturnScanner(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
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
            "Scanner retour expediteur",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: colors.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Tu peux confirmer le retour depuis la liste ou scanner directement le code barre.",
            style: TextStyle(color: theme.textTheme.bodySmall?.color),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              height: 240,
              child: Stack(
                children: [
                  MobileScanner(
                    controller: _scannerController,
                    onDetect: (capture) {
                      if (!_scanEnabled || _submitting) {
                        return;
                      }
                      final barcode = capture.barcodes.isNotEmpty
                          ? capture.barcodes.first.rawValue ?? ""
                          : "";
                      if (barcode.trim().isEmpty) {
                        return;
                      }
                      _submitReturnByCode(barcode);
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
                  if (_submitting)
                    const Positioned.fill(
                      child: ColoredBox(
                        color: Color(0x66000000),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _manualReturnController,
            enabled: !_submitting,
            decoration: const InputDecoration(
              labelText: "Code barre",
              hintText: "Ex: 625028080000",
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: _submitReturnByCode,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _submitting
                      ? null
                      : () => _submitReturnByCode(_manualReturnController.text),
                  child: const Text("Confirmer le retour"),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
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
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _scanAgain,
                child: const Text("Scanner a nouveau"),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: RefreshIndicator(
        onRefresh: _loadItems,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
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
                    _title,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _subtitle,
                    style: TextStyle(color: theme.textTheme.bodySmall?.color),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      "${_items.length} colis",
                      style: TextStyle(
                        color: colors.primary,
                        fontWeight: FontWeight.w900,
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
                  color: _messageIsError
                      ? const Color(0xFFFFF1F1)
                      : const Color(0xFFEAF8EF),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: _messageIsError
                        ? const Color(0xFFFFD1D1)
                        : const Color(0xFFCDE9D7),
                  ),
                ),
                child: Text(
                  _message,
                  style: TextStyle(
                    color: _messageIsError
                        ? const Color(0xFFB44A4A)
                        : const Color(0xFF2E8F5B),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
            if (widget.mode == ParcelOverviewMode.returned) ...[
              const SizedBox(height: 16),
              _buildReturnScanner(context),
            ],
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_message.isNotEmpty && _items.isEmpty)
              const SizedBox.shrink()
            else if (_items.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: theme.dividerColor),
                ),
                child: Text(
                  _emptyMessage,
                  style: TextStyle(
                    color: colors.onSurface,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              )
            else
              Column(
                children: _items.map((item) {
                  final trackingStage = item["tracking_stage"]?.toString();
                  final canReport =
                      widget.mode == ParcelOverviewMode.notDelivered
                      ? _canReportUndelivered(item)
                      : false;
                  final canConfirm = widget.mode == ParcelOverviewMode.returned
                      ? _canConfirmReturn(item)
                      : false;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: theme.dividerColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item["numero_suivi"]?.toString() ?? "-",
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: colors.onSurface,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item["nom_destinataire"]?.toString() ??
                                          "-",
                                      style: TextStyle(
                                        color: colors.onSurface,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              _ChipLabel(
                                label: _stageLabel(trackingStage),
                                color: canConfirm
                                    ? const Color(0xFF8B5CF6)
                                    : colors.primary,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            item["adresse_livraison"]?.toString() ?? "-",
                            style: TextStyle(
                              color: theme.textTheme.bodySmall?.color,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _MiniInfo(
                                label: "Statut",
                                value: _statusLabel(item["statut"]?.toString()),
                              ),
                              _MiniInfo(
                                label: "Code",
                                value: item["barcode_value"]?.toString() ?? "-",
                              ),
                              _MiniInfo(
                                label: "Sorti depot",
                                value: _formatDateTime(
                                  item["out_for_delivery_at"]?.toString(),
                                ),
                              ),
                              _MiniInfo(
                                label: "Tentatives reportees",
                                value:
                                    item["delivery_issue_count"]?.toString() ??
                                    "0",
                              ),
                              if ((item["last_delivery_issue_reason"]
                                          ?.toString() ??
                                      "")
                                  .isNotEmpty)
                                _MiniInfo(
                                  label: "Dernier motif",
                                  value:
                                      item["last_delivery_issue_reason"]
                                          ?.toString() ??
                                      "-",
                                ),
                              if (widget.mode == ParcelOverviewMode.returned)
                                _MiniInfo(
                                  label: "Retour expediteur",
                                  value: _formatDateTime(
                                    item["returned_at"]?.toString(),
                                  ),
                                ),
                            ],
                          ),
                          if (canReport || canConfirm) ...[
                            const SizedBox(height: 14),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _submitting
                                    ? null
                                    : canReport
                                    ? () => _openReasonDialog(item)
                                    : () => _confirmReturnFromList(item),
                                child: Text(
                                  canReport
                                      ? "Saisir le motif a relivrer"
                                      : "Confirmer le retour expediteur",
                                ),
                              ),
                            ),
                          ] else if (widget.mode ==
                                  ParcelOverviewMode.notDelivered &&
                              trackingStage == "at_warehouse") ...[
                            const SizedBox(height: 14),
                            Text(
                              "Motif deja saisi. Ce colis peut maintenant etre scanne demain pour une nouvelle sortie depot.",
                              style: TextStyle(
                                color: theme.textTheme.bodySmall?.color,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ] else if (widget.mode ==
                                  ParcelOverviewMode.returned &&
                              (item["returned_at"]?.toString() ?? "")
                                  .isNotEmpty) ...[
                            const SizedBox(height: 14),
                            Text(
                              "Retour expediteur deja confirme.",
                              style: TextStyle(
                                color: theme.textTheme.bodySmall?.color,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }
}

class _ChipLabel extends StatelessWidget {
  const _ChipLabel({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _MiniInfo extends StatelessWidget {
  const _MiniInfo({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: theme.dividerColor.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: theme.textTheme.bodySmall?.color,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
