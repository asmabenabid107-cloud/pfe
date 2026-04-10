import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/storage.dart';
import '../widgets/global_theme_toggle.dart';

class LeaveRequestsScreen extends StatefulWidget {
  const LeaveRequestsScreen({super.key});

  @override
  State<LeaveRequestsScreen> createState() => _LeaveRequestsScreenState();
}

class _LeaveRequestsScreenState extends State<LeaveRequestsScreen> {
  bool loading = true;
  bool saving = false;
  String msg = "";
  List<Map<String, dynamic>> leaveRequests = [];
  DateTime? startDate;
  DateTime? endDate;

  @override
  void initState() {
    super.initState();
    loadLeaves();
  }

  Future<void> loadLeaves() async {
    setState(() {
      loading = true;
      msg = "";
    });

    try {
      final response = await Api.getJson("/courier/leaves", withAuth: true);
      final rawItems = response["data"] is List
          ? response["data"] as List
          : response["items"] is List
          ? response["items"] as List
          : <dynamic>[];

      setState(() {
        leaveRequests = rawItems
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await Storage.clearToken();
        if (!mounted) {
          return;
        }
        Navigator.pushNamedAndRemoveUntil(
          context,
          "/login",
          (_) => false,
          arguments: e.message,
        );
        return;
      }
      setState(() => msg = e.message);
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  DateTime? _parseDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }
    return DateTime.tryParse(raw);
  }

  String _formatDate(String? raw) {
    final parsed = _parseDate(raw);
    if (parsed == null) {
      return raw == null || raw.trim().isEmpty ? "Non definie" : raw;
    }

    final day = parsed.day.toString().padLeft(2, '0');
    final month = parsed.month.toString().padLeft(2, '0');
    final year = parsed.year.toString();
    return "$day/$month/$year";
  }

  String _formatPickerDate(DateTime? value) {
    if (value == null) {
      return "Choisir";
    }

    final day = value.day.toString().padLeft(2, '0');
    final month = value.month.toString().padLeft(2, '0');
    final year = value.year.toString();
    return "$day/$month/$year";
  }

  String _apiDate(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return "$year-$month-$day";
  }

  String _statusLabel(String status) {
    switch (status) {
      case "approved":
        return "Approuvee";
      case "denied":
        return "Refusee";
      default:
        return "En attente";
    }
  }

  Color _statusBorder(String status) {
    switch (status) {
      case "approved":
        return const Color(0x662CCB76);
      case "denied":
        return const Color(0x66FF5F5F);
      default:
        return const Color(0x66F59E0B);
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case "approved":
        return const Color(0x142CCB76);
      case "denied":
        return const Color(0x14FF5F5F);
      default:
        return const Color(0x14F59E0B);
    }
  }

  Map<String, dynamic>? get _pendingRequest {
    for (final item in leaveRequests) {
      if ((item["status"]?.toString() ?? "") == "pending") {
        return item;
      }
    }
    return null;
  }

  Map<String, dynamic>? get _approvedUpcomingOrCurrent {
    final today = DateTime.now();
    final reference = DateTime(today.year, today.month, today.day);

    for (final item in leaveRequests) {
      if ((item["status"]?.toString() ?? "") != "approved") {
        continue;
      }
      final end = _parseDate(item["end_date"]?.toString());
      if (end == null) {
        continue;
      }
      final cleanEnd = DateTime(end.year, end.month, end.day);
      if (!cleanEnd.isBefore(reference)) {
        return item;
      }
    }
    return null;
  }

  Map<String, dynamic>? get _currentLeave {
    final today = DateTime.now();
    final reference = DateTime(today.year, today.month, today.day);

    for (final item in leaveRequests) {
      if ((item["status"]?.toString() ?? "") != "approved") {
        continue;
      }
      final start = _parseDate(item["start_date"]?.toString());
      final end = _parseDate(item["end_date"]?.toString());
      if (start == null || end == null) {
        continue;
      }
      final cleanStart = DateTime(start.year, start.month, start.day);
      final cleanEnd = DateTime(end.year, end.month, end.day);
      if (!reference.isBefore(cleanStart) && !reference.isAfter(cleanEnd)) {
        return item;
      }
    }
    return null;
  }

  bool get _canCreateRequest =>
      _pendingRequest == null && _approvedUpcomingOrCurrent == null;

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: startDate ?? now,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      startDate = picked;
      if (endDate != null && endDate!.isBefore(picked)) {
        endDate = picked;
      }
    });
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final initial = endDate ?? startDate ?? now;
    final first = startDate ?? DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: first,
      lastDate: DateTime(now.year + 2),
    );

    if (picked == null) {
      return;
    }

    setState(() => endDate = picked);
  }

  Future<void> submitRequest() async {
    if (!_canCreateRequest) {
      setState(
        () => msg = "Une seule demande de conge peut etre active a la fois.",
      );
      return;
    }
    if (startDate == null || endDate == null) {
      setState(() => msg = "Choisis les dates de debut et de fin.");
      return;
    }
    if (endDate!.isBefore(startDate!)) {
      setState(() => msg = "La date de fin doit etre apres la date de debut.");
      return;
    }

    setState(() {
      saving = true;
      msg = "";
    });

    try {
      await Api.postJson(
        "/courier/leaves",
        body: {
          "start_date": _apiDate(startDate!),
          "end_date": _apiDate(endDate!),
        },
      );
      setState(() {
        startDate = null;
        endDate = null;
        msg = "Demande de conge envoyee avec succes.";
      });
      await loadLeaves();
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await Storage.clearToken();
        if (!mounted) {
          return;
        }
        Navigator.pushNamedAndRemoveUntil(
          context,
          "/login",
          (_) => false,
          arguments: e.message,
        );
        return;
      }
      setState(() => msg = e.message);
    } finally {
      if (mounted) {
        setState(() => saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentLeave = _currentLeave;
    final blockingRequest = _pendingRequest ?? _approvedUpcomingOrCurrent;
    final historyItems = leaveRequests
        .where((item) => item["id"] != currentLeave?["id"])
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Mes conges",
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: [
          const ThemeIconButton(),
          IconButton(onPressed: loadLeaves, icon: const Icon(Icons.refresh)),
          const SizedBox(width: 8),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: [
                  if (msg.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: msg.contains("succes")
                              ? const Color(0x662CCB76)
                              : const Color(0x66FF5F5F),
                        ),
                        color: msg.contains("succes")
                            ? const Color(0x142CCB76)
                            : const Color(0x14FF5F5F),
                      ),
                      child: Text(
                        msg,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  if (msg.isNotEmpty) const SizedBox(height: 12),

                  if (currentLeave != null) ...[
                    _SectionCard(
                      title: "Conge actuel",
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _StatusChip(
                            label: "Approuve",
                            borderColor: _statusBorder("approved"),
                            backgroundColor: _statusBg("approved"),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            "Du ${_formatDate(currentLeave["start_date"]?.toString())} au ${_formatDate(currentLeave["end_date"]?.toString())}",
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Opacity(
                            opacity: 0.75,
                            child: Text(
                              "Ton statut passe automatiquement en conge temporaire pendant cette periode.",
                              style: TextStyle(height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  _SectionCard(
                    title: "Nouvelle demande",
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_canCreateRequest) ...[
                          const Opacity(
                            opacity: 0.75,
                            child: Text(
                              "Tu peux envoyer une seule demande de conge a la fois.",
                              style: TextStyle(height: 1.4),
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: saving ? null : _pickStartDate,
                              icon: const Icon(Icons.event),
                              label: Text(
                                "Debut: ${_formatPickerDate(startDate)}",
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: saving ? null : _pickEndDate,
                              icon: const Icon(Icons.event_available),
                              label: Text("Fin: ${_formatPickerDate(endDate)}"),
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: saving ? null : submitRequest,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (saving)
                                    const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                  if (saving) const SizedBox(width: 10),
                                  Text(
                                    saving ? "Envoi..." : "Envoyer la demande",
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ] else ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0x66F59E0B),
                              ),
                              color: const Color(0x14F59E0B),
                            ),
                            child: Text(
                              blockingRequest?["status"] == "pending"
                                  ? "Une demande est deja en attente. Tu pourras en envoyer une autre apres traitement."
                                  : "Un conge approuve est deja actif ou planifie. Une nouvelle demande sera possible apres la fin de cette periode.",
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  _SectionCard(
                    title: "Historique",
                    child: historyItems.isEmpty
                        ? const Opacity(
                            opacity: 0.75,
                            child: Text(
                              "Aucune demande de conge pour le moment.",
                            ),
                          )
                        : Column(
                            children: historyItems.map((item) {
                              final status =
                                  item["status"]?.toString() ?? "pending";
                              return Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0x24FFFFFF),
                                  ),
                                  color: const Color(0x10FFFFFF),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        _StatusChip(
                                          label: _statusLabel(status),
                                          borderColor: _statusBorder(status),
                                          backgroundColor: _statusBg(status),
                                        ),
                                        Text(
                                          "Du ${_formatDate(item["start_date"]?.toString())} au ${_formatDate(item["end_date"]?.toString())}",
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Opacity(
                                      opacity: 0.72,
                                      child: Text(
                                        "Demandee le ${_formatDate(item["requested_at"]?.toString())}",
                                      ),
                                    ),
                                    if (status == "denied" &&
                                        (item["denial_reason"]
                                                ?.toString()
                                                .trim()
                                                .isNotEmpty ??
                                            false)) ...[
                                      const SizedBox(height: 10),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: const Color(0x44FF5F5F),
                                          ),
                                          color: const Color(0x14FF5F5F),
                                        ),
                                        child: Text(
                                          "Raison du refus: ${item["denial_reason"]}",
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color borderColor;
  final Color backgroundColor;

  const _StatusChip({
    required this.label,
    required this.borderColor,
    required this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
        color: backgroundColor,
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
      ),
    );
  }
}
