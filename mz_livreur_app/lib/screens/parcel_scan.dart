import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

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

  Timer? _manualOpenTimer;
  bool _scanEnabled = true;
  bool _opening = false;
  bool _torchEnabled = false;
  String _message = "";

  @override
  void initState() {
    super.initState();
    final initialCode = _extractScanCode(widget.initialCode);
    if (initialCode.isNotEmpty) {
      _manualController.text = initialCode;
      _scanEnabled = false;
      Future.microtask(() async {
        await _scannerController.stop();
        await _openParcel(initialCode, replace: true);
      });
    }
  }

  @override
  void dispose() {
    _manualOpenTimer?.cancel();
    _scannerController.dispose();
    _manualController.dispose();
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

  bool _isCompleteManualCode(String code) => RegExp(r'^\d{12}$').hasMatch(code);

  void _handleManualCodeChanged(String value) {
    final code = _extractScanCode(value);
    _manualOpenTimer?.cancel();

    setState(() {
      _message = code.isEmpty
          ? ""
          : _isCompleteManualCode(code)
          ? "Code complet. Ouverture du colis..."
          : "Complete le code ou scanne le QR.";
    });

    if (!_isCompleteManualCode(code)) return;

    _manualOpenTimer = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      final latestCode = _extractScanCode(_manualController.text);
      if (latestCode == code) {
        _openParcel(code, replace: true);
      }
    });
  }

  Future<void> _captureCode(String rawValue) async {
    if (!_scanEnabled || _opening) return;

    final code = _extractScanCode(rawValue);
    if (code.isEmpty) return;

    _manualOpenTimer?.cancel();
    await _scannerController.stop();
    if (!mounted) return;

    setState(() {
      _scanEnabled = false;
      _manualController.text = code;
      _message = "QR lu. Ouverture du colis...";
    });

    await _openParcel(code, replace: true);
  }

  Future<void> _openParcel(String rawCode, {bool replace = false}) async {
    final code = _extractScanCode(rawCode);
    if (code.isEmpty || _opening) return;

    setState(() {
      _opening = true;
      _message = "Ouverture du colis...";
    });

    final route = "/colis-action?code=${Uri.encodeQueryComponent(code)}";
    if (!mounted) return;
    if (replace) {
      Navigator.pushReplacementNamed(context, route, arguments: {"code": code});
    } else {
      Navigator.pushNamed(context, route, arguments: {"code": code});
    }
  }

  Future<void> _scanAgain() async {
    _manualOpenTimer?.cancel();
    await _scannerController.start();
    if (!mounted) return;
    setState(() {
      _scanEnabled = true;
      _opening = false;
      _message = "";
      _manualController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final currentCode = _extractScanCode(_manualController.text);
    final canOpen = currentCode.isNotEmpty && !_opening;

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
                    "Scanner le QR",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Scanne le QR du bon de livraison pour ouvrir la fiche du colis et changer son statut.",
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
                          "Camera",
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
                          if (!_scanEnabled || _opening)
                            Positioned.fill(
                              child: Container(
                                color: Colors.black.withValues(alpha: 0.58),
                                alignment: Alignment.center,
                                padding: const EdgeInsets.all(18),
                                child: Text(
                                  _opening ? "Ouverture..." : "QR lu",
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
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
                    onSubmitted: (value) => _openParcel(value, replace: true),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: canOpen
                              ? () => _openParcel(currentCode, replace: true)
                              : null,
                          icon: _opening
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.open_in_new_rounded),
                          label: Text(_opening ? "Ouverture..." : "Ouvrir"),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: _scanAgain,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text("Reset"),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (_message.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: theme.dividerColor),
                ),
                child: Text(
                  _message,
                  style: TextStyle(
                    color: colors.onSurface,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
