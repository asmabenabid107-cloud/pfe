import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/storage.dart';
import '../theme/theme_controller.dart';
import '../widgets/global_theme_toggle.dart';
import 'tournee_map_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool loading = true;
  bool assignedLoading = true;
  String msg = "";
  String assignedMsg = "";
  Map<String, dynamic>? me;
  List<Map<String, dynamic>> assignedColis = [];

  @override
  void initState() {
    super.initState();
    loadMe();
  }

  Future<void> loadMe() async {
    setState(() {
      loading = true;
      assignedLoading = true;
      msg = "";
      assignedMsg = "";
    });

    try {
      final data = await Api.getJson("/auth/me", withAuth: true);
      List<Map<String, dynamic>> nextAssigned = [];
      String nextAssignedMsg = "";

      try {
        final assignedData = await Api.getJson(
          "/courier/colis/assigned",
          withAuth: true,
        );

        nextAssigned = _readList(assignedData);

        if (nextAssigned.isNotEmpty) {
          debugPrint("FIRST COLIS KEYS: ${nextAssigned.first.keys.toList()}");
          debugPrint("FIRST COLIS DATA: ${nextAssigned.first}");
        }
      } on ApiException catch (e) {
        if (e.statusCode == 401 || e.statusCode == 403) {
          rethrow;
        }
        nextAssignedMsg = e.message;
      }

      setState(() {
        me = data;
        assignedColis = nextAssigned;
        assignedMsg = nextAssignedMsg;
      });
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await Storage.clearToken();
        if (!mounted) return;

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
        setState(() {
          loading = false;
          assignedLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> _readList(Map<String, dynamic> response) {
    final raw = response["data"];

    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    final colis = response["colis"];
    if (colis is List) {
      return colis
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    final items = response["items"];
    if (items is List) {
      return items
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    return [];
  }

  Future<void> logout() async {
    await Storage.clearToken();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, "/", (_) => false);
  }

  void openMenuSheet() {
    final theme = Theme.of(context);
    final palette = _DashboardPalette.of(context);
    final controller = ThemeController.of(context);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              20,
              14,
              20,
              24 + MediaQuery.of(sheetContext).padding.bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: theme.dividerColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 20),
                _MenuTile(
                  icon: Icons.account_circle_outlined,
                  title: "Mon profil",
                  subtitle: "Voir et modifier mes informations",
                  onTap: () {
                    Navigator.pop(sheetContext);
                    Navigator.pushNamed(context, "/profile");
                  },
                ),
                const SizedBox(height: 10),
                _MenuTile(
                  icon: Icons.event_note_outlined,
                  title: "Mes conges",
                  subtitle: "Envoyer une demande et suivre l'historique",
                  onTap: () {
                    Navigator.pop(sheetContext);
                    Navigator.pushNamed(context, "/conges");
                  },
                ),
                const SizedBox(height: 10),
                _MenuTile(
                  icon: palette.isDark
                      ? Icons.light_mode_outlined
                      : Icons.dark_mode_outlined,
                  title: palette.isDark ? "Mode clair" : "Mode sombre",
                  subtitle: "Changer l'apparence de l'application",
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await controller.toggle();
                  },
                ),
                const SizedBox(height: 10),
                _MenuTile(
                  icon: Icons.logout_rounded,
                  title: "Se deconnecter",
                  subtitle: "Quitter l'espace livreur",
                  onTap: () {
                    Navigator.pop(sheetContext);
                    logout();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case "temporary_leave":
        return "Conge temporaire";
      case "contract_ended":
        return "Contrat termine";
      default:
        return "Actif";
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case "temporary_leave":
        return const Color(0xFFF0A81A);
      case "contract_ended":
        return const Color(0xFFFF6D6D);
      default:
        return const Color(0xFF31C476);
    }
  }

  String _parcelStatusLabel(String? status) {
    final raw = (status ?? "").toLowerCase();
    if (raw.contains("relivr") || raw.contains("report")) return "A relivrer";
    if (raw.contains("transit")) return "En transit";
    if (raw.contains("livr")) return "Livre";
    if (raw.contains("retour")) return "Retour";
    if (raw.contains("annul")) return "Annule";
    return "En attente";
  }

  Color _assignedParcelColor(Map<String, dynamic> item) {
    final statut = (item["statut"]?.toString() ?? "").toLowerCase();
    final stage = (item["tracking_stage"]?.toString() ?? "").toLowerCase();
    final returnedAt = item["returned_at"]?.toString() ?? "";
    final deliveredAt = item["delivered_at"]?.toString() ?? "";

    if (returnedAt.isNotEmpty ||
        stage == "returned" ||
        stage == "return_pending" ||
        stage.contains("return") ||
        statut.contains("retour")) {
      return const Color(0xFFE53935);
    }

    if (deliveredAt.isNotEmpty ||
        stage == "delivered" ||
        statut.contains("livr")) {
      return const Color(0xFF31C476);
    }

    return const Color(0xFFF0A81A);
  }

  String _parcelStageLabel(String? stage) {
    final raw = (stage ?? "").toLowerCase();

    if (raw == "return_pending") return "Depot retour expediteur";
    if (raw == "returned") return "Retour confirme";
    if (raw.contains("return")) return "Retour expediteur";
    if (raw == "picked_up" || raw.contains("picked")) {
      return "Recupere chez expediteur";
    }
    if (raw == "out_for_delivery" ||
        (raw.contains("out") && raw.contains("delivery"))) {
      return "En transit";
    }
    if (raw == "at_warehouse" || raw.contains("warehouse")) return "Au depot";
    if (raw == "delivered" || raw.contains("deliver")) return "Livre";

    return "En attente";
  }

  String _formatDateTime(String? value) {
    if (value == null || value.trim().isEmpty) return "-";

    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;

    final local = parsed.toLocal();
    String twoDigits(int input) => input.toString().padLeft(2, "0");

    return "${twoDigits(local.day)}/${twoDigits(local.month)}/${local.year} "
        "${twoDigits(local.hour)}:${twoDigits(local.minute)}";
  }

  String _parcelCode(Map<String, dynamic> item) {
    final barcode = item["barcode_value"]?.toString().trim() ?? "";
    if (barcode.isNotEmpty) return barcode;

    return item["numero_suivi"]?.toString().trim() ?? "";
  }

  void _openAssignedColis(Map<String, dynamic> item) {
    final code = _parcelCode(item);

    if (code.isEmpty) {
      setState(() => assignedMsg = "Code colis introuvable.");
      return;
    }

    Navigator.pushNamed(
      context,
      "/colis-action?code=${Uri.encodeQueryComponent(code)}",
      arguments: {
        "code": code,
        "colis": item,
      },
    );
  }

  double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  String _firstText(List<dynamic> values, {String fallback = ""}) {
    for (final value in values) {
      final text = value?.toString().trim() ?? "";
      if (text.isNotEmpty && text != "null") {
        return text;
      }
    }
    return fallback;
  }

  Map<String, dynamic> _depotForLivreur() {
    final rawRegion = _firstText([
      me?["assigned_region"],
      me?["region"],
      me?["gouvernorat"],
    ]).toLowerCase();

    if (rawRegion.contains("sousse")) {
      return {
        "label": "Depot Sousse",
        "adresse": "Sousse, Tunisie",
        "latitude": 35.77005959180682,
        "longitude": 10.594931528518906,
        "depot_depart": "sousse",
      };
    }

    if (rawRegion.contains("kairouan")) {
      return {
        "label": "Depot Kairouan",
        "adresse": "Kairouan, Tunisie",
        "latitude": 35.68779123889766,
        "longitude": 10.083732874866017,
        "depot_depart": "kairouan",
      };
    }

    return {
      "label": "Depot",
      "adresse": "",
      "latitude": null,
      "longitude": null,
      "depot_depart": rawRegion,
    };
  }

  void _openPlanificationMap() {
    if (assignedColis.isEmpty) {
      setState(() {
        assignedMsg = "Aucun colis affecte pour afficher la carte.";
      });
      return;
    }

    final depot = _depotForLivreur();
    final stops = <Map<String, dynamic>>[];

    for (var i = 0; i < assignedColis.length; i++) {
      final colis = assignedColis[i];

      final lat = _toDouble(
        colis["latitude"] ??
            colis["lat"] ??
            colis["client_latitude"] ??
            colis["destination_latitude"] ??
            colis["destinataire_latitude"] ??
            colis["adresse_latitude"] ??
            colis["latitude_livraison"] ??
            colis["livraison_latitude"] ??
            colis["lat_livraison"] ??
            colis["gps_lat"] ??
            colis["gps_latitude"] ??
            colis["coord_lat"] ??
            colis["coordonnees_latitude"],
      );

      final lng = _toDouble(
        colis["longitude"] ??
            colis["lng"] ??
            colis["lon"] ??
            colis["client_longitude"] ??
            colis["destination_longitude"] ??
            colis["destinataire_longitude"] ??
            colis["adresse_longitude"] ??
            colis["longitude_livraison"] ??
            colis["livraison_longitude"] ??
            colis["lng_livraison"] ??
            colis["lon_livraison"] ??
            colis["gps_lng"] ??
            colis["gps_longitude"] ??
            colis["coord_lng"] ??
            colis["coordonnees_longitude"],
      );

      debugPrint(
        "COLIS GPS CHECK id=${colis["id"]} lat=$lat lng=$lng keys=${colis.keys.toList()}",
      );

      if (lat == null || lng == null) {
        continue;
      }

      stops.add({
        "ordre": int.tryParse("${colis["ordre"] ?? i + 1}") ?? i + 1,
        "colis_id": colis["id"],
        "numero_suivi": _firstText([
          colis["numero_suivi"],
          colis["barcode_value"],
          colis["code"],
        ]),
        "adresse": _firstText([
          colis["adresse"],
          colis["adresse_livraison"],
          colis["rue"],
        ], fallback: "Adresse non definie"),
        "latitude": lat,
        "longitude": lng,
        "nom_destinataire": _firstText([
          colis["nom_destinataire"],
          colis["destinataire"],
          colis["client_name"],
        ]),
        "telephone_destinataire": _firstText([
          colis["telephone_destinataire"],
          colis["phone_destinataire"],
          colis["telephone"],
          colis["phone"],
        ]),
        "poids": colis["poids"],
        "tracking_stage": colis["tracking_stage"],
      });
    }

    if (stops.isEmpty) {
      setState(() {
        assignedMsg =
            "Aucun colis avec coordonnees GPS. Verifie la console: FIRST COLIS KEYS.";
      });
      return;
    }

    final tourneeJson = {
      "id": DateTime.now().millisecondsSinceEpoch,
      "nom": "Ma tournee",
      "depot_depart": depot["depot_depart"],
      "depot_label": depot["label"],
      "depot_adresse": depot["adresse"],
      "depot_latitude": depot["latitude"],
      "depot_longitude": depot["longitude"],
      "nombre_colis": stops.length,
      "stops": stops,
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TourneeMapScreen(
          tournee: tourneeJson,
        ),
      ),
    );
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return "Non definie";
    }

    final parsed = DateTime.tryParse(raw);
    if (parsed == null) {
      return raw;
    }

    final day = parsed.day.toString().padLeft(2, '0');
    final month = parsed.month.toString().padLeft(2, '0');
    final year = parsed.year.toString();

    return "$day/$month/$year";
  }

  @override
  Widget build(BuildContext context) {
    final palette = _DashboardPalette.of(context);
    final theme = Theme.of(context);

    final name = me?["name"]?.toString().trim().isNotEmpty == true
        ? me!["name"].toString().trim()
        : "Livreur";

    final email = me?["email"]?.toString() ?? "-";
    final phone = me?["phone"]?.toString() ?? "-";
    final region = me?["assigned_region"]?.toString().trim();

    final status = me?["courier_status"]?.toString().trim().isNotEmpty == true
        ? me!["courier_status"].toString()
        : "active";

    final contractEndDate = _formatDate(me?["contract_end_date"]?.toString());
    final statusLabel = _statusLabel(status);

    final firstLetter = name.isNotEmpty
        ? name.substring(0, 1).toUpperCase()
        : "L";

    return Scaffold(
      backgroundColor: palette.pageBg,
      body: SafeArea(
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: loadMe,
                color: palette.accent,
                child: ListView(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: palette.avatarBg,
                          ),
                          child: Center(
                            child: Text(
                              firstLetter,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                              ),
                            ),
                          ),
                        ),
                        const Spacer(),
                        _TopIconButton(
                          icon: Icons.search_rounded,
                          onTap: () => Navigator.pushNamed(context, "/profile"),
                        ),
                        const SizedBox(width: 10),
                        _TopIconButton(
                          icon: Icons.notifications_none_rounded,
                          onTap: loadMe,
                          hasDot: true,
                        ),
                        const SizedBox(width: 10),
                        const ThemeIconButton(),
                        const SizedBox(width: 6),
                        _TopIconButton(
                          icon: Icons.menu_rounded,
                          onTap: openMenuSheet,
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    if (msg.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.cardColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFFD5D5)),
                          boxShadow: [palette.cardShadow],
                        ),
                        child: Text(
                          msg,
                          style: const TextStyle(
                            color: Color(0xFFBB3D3D),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [palette.cardShadow],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: palette.bannerBadgeBg,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              "Info",
                              style: TextStyle(
                                color: palette.text,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "Bienvenue $name. Region: ${region != null && region.isNotEmpty ? region : "non assignee"}",
                              style: TextStyle(
                                color: palette.text,
                                fontWeight: FontWeight.w600,
                                height: 1.3,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: loadMe,
                            icon: Icon(
                              Icons.refresh_rounded,
                              color: palette.muted,
                            ),
                            splashRadius: 18,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isSmall = constraints.maxWidth < 520;

                        return GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          childAspectRatio: isSmall ? 0.88 : 1.05,
                          children: [
                            _QuickCard(
                              icon: Icons.assignment_outlined,
                              iconColor: const Color(0xFF4ED2A8),
                              title: "Mon profil",
                              subtitle: "Modifier mes donnees",
                              onTap: () =>
                                  Navigator.pushNamed(context, "/profile"),
                            ),
                            _QuickCard(
                              icon: Icons.event_note_outlined,
                              iconColor: const Color(0xFF398BFF),
                              title: "Mes conges",
                              subtitle: "Demandes et historique",
                              onTap: () =>
                                  Navigator.pushNamed(context, "/conges"),
                            ),
                            _QuickCard(
                              icon: Icons.route_outlined,
                              iconColor: const Color(0xFFFE8B65),
                              title: "Planification",
                              subtitle: assignedLoading
                                  ? "Chargement..."
                                  : "${assignedColis.length} colis affectes",
                              onTap: assignedLoading
                                  ? () {}
                                  : _openPlanificationMap,
                            ),
                            _QuickCard(
                              icon: Icons.map_outlined,
                              iconColor: const Color(0xFFFE8B65),
                              title: "Region",
                              subtitle: region != null && region.isNotEmpty
                                  ? region
                                  : "Non assignee",
                              onTap: () =>
                                  Navigator.pushNamed(context, "/profile"),
                            ),
                            _QuickCard(
                              icon: Icons.verified_user_outlined,
                              iconColor: _statusColor(status),
                              title: "Statut",
                              subtitle: statusLabel,
                              onTap: () =>
                                  Navigator.pushNamed(context, "/conges"),
                            ),
                            _QuickCard(
                              icon: Icons.qr_code_scanner_rounded,
                              iconColor: const Color(0xFF9B87F5),
                              title: "Scanner colis",
                              subtitle: "En transit, livre, a relivrer ou retour",
                              onTap: () => Navigator.pushNamed(context, "/scan"),
                            ),
                          ],
                        );
                      },
                    ),

                    const SizedBox(height: 18),

                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: theme.dividerColor),
                        boxShadow: [palette.cardShadow],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(15),
                                  color: const Color(0xFF4ED2A8)
                                      .withValues(alpha: 0.12),
                                ),
                                child: const Icon(
                                  Icons.inventory_2_outlined,
                                  color: Color(0xFF31A982),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Colis affectes",
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: palette.text,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      assignedLoading
                                          ? "Chargement..."
                                          : "${assignedColis.length} colis dans tes tournees",
                                      style: TextStyle(
                                        color: palette.muted,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: assignedLoading ? null : loadMe,
                                icon: Icon(
                                  Icons.refresh_rounded,
                                  color: palette.accent,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 16),

                          if (assignedLoading)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 18),
                                child: CircularProgressIndicator(),
                              ),
                            )
                          else if (assignedMsg.isNotEmpty)
                            _DashboardMessage(
                              text: assignedMsg,
                              positive: false,
                            )
                          else if (assignedColis.isEmpty)
                            const _DashboardMessage(
                              text: "Aucun colis affecte pour le moment.",
                              positive: true,
                            )
                          else
                            Column(
                              children: [
                                for (var i = 0; i < assignedColis.length; i++)
                                  Padding(
                                    padding: EdgeInsets.only(
                                      bottom: i == assignedColis.length - 1
                                          ? 0
                                          : 10,
                                    ),
                                    child: _AssignedParcelTile(
                                      item: assignedColis[i],
                                      statusLabel: _parcelStatusLabel(
                                        assignedColis[i]["statut"]?.toString(),
                                      ),
                                      stageLabel: _parcelStageLabel(
                                        assignedColis[i]["tracking_stage"]
                                            ?.toString(),
                                      ),
                                      dateLabel: _formatDateTime(
                                        assignedColis[i]["out_for_delivery_at"]
                                            ?.toString(),
                                      ),
                                      statusColor: _assignedParcelColor(
                                        assignedColis[i],
                                      ),
                                      onTap: () => _openAssignedColis(
                                        assignedColis[i],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [palette.cardShadow],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: palette.statusBubbleBg,
                                  border: Border.all(
                                    color: palette.statusBubbleBorder,
                                  ),
                                ),
                                child: Icon(
                                  Icons.badge_outlined,
                                  color: _statusColor(status),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  "Mon espace",
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: palette.text,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          Row(
                            children: [
                              Expanded(
                                child: _InfoBox(title: "Email", value: email),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _InfoBox(
                                  title: "Telephone",
                                  value: phone,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 10),

                          Row(
                            children: [
                              Expanded(
                                child: _InfoBox(
                                  title: "Fin contrat",
                                  value: contractEndDate,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _InfoBox(
                                  title: "Compte",
                                  value: statusLabel,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: palette.heroGradient,
                              ),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Navigation rapide",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  "Accede a ton profil ou gere tes conges depuis les boutons ci-dessous.",
                                  style: TextStyle(
                                    color: Color(0xEFFFFFFF),
                                    height: 1.35,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () => Navigator.pushNamed(
                                          context,
                                          "/profile",
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.white,
                                          foregroundColor: palette.accent,
                                          elevation: 0,
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 12,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                        ),
                                        child: const Text(
                                          "Profil",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () => Navigator.pushNamed(
                                          context,
                                          "/conges",
                                        ),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.white,
                                          side: const BorderSide(
                                            color: Color(0x55FFFFFF),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 12,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                        ),
                                        child: const Text(
                                          "Conges",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _DashboardPalette {
  const _DashboardPalette({
    required this.isDark,
    required this.pageBg,
    required this.text,
    required this.muted,
    required this.accent,
    required this.avatarBg,
    required this.bannerBadgeBg,
    required this.statusBubbleBg,
    required this.statusBubbleBorder,
    required this.cardShadow,
    required this.heroGradient,
  });

  factory _DashboardPalette.of(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return _DashboardPalette(
      isDark: isDark,
      pageBg: isDark ? const Color(0xFF0B1120) : Colors.white,
      text: isDark ? const Color(0xFFF2F4FB) : const Color(0xFF1B1D27),
      muted: isDark ? const Color(0xFFA7B0C8) : const Color(0xFF8C90A3),
      accent: theme.colorScheme.primary,
      avatarBg: isDark ? const Color(0xFF1D2537) : const Color(0xFF1F212B),
      bannerBadgeBg: isDark ? const Color(0xFF40351A) : const Color(0xFFF6C866),
      statusBubbleBg: isDark
          ? const Color(0xFF193126)
          : const Color(0xFFE6F5EA),
      statusBubbleBorder: isDark
          ? const Color(0xFF29523F)
          : const Color(0xFFC8E9D1),
      cardShadow: BoxShadow(
        color: isDark ? const Color(0x22000000) : const Color(0x110D1530),
        blurRadius: 22,
        offset: const Offset(0, 10),
      ),
      heroGradient: isDark
          ? const [Color(0xFF6441C9), Color(0xFF462C94)]
          : const [Color(0xFF8B5CF6), Color(0xFF6C47D9)],
    );
  }

  final bool isDark;
  final Color pageBg;
  final Color text;
  final Color muted;
  final Color accent;
  final Color avatarBg;
  final Color bannerBadgeBg;
  final Color statusBubbleBg;
  final Color statusBubbleBorder;
  final BoxShadow cardShadow;
  final List<Color> heroGradient;
}

class _TopIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool hasDot;

  const _TopIconButton({
    required this.icon,
    required this.onTap,
    this.hasDot = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF171F33) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Center(
                child: Icon(
                  icon,
                  color: isDark
                      ? const Color(0xFFC1C7DD)
                      : const Color(0xFF6F7388),
                ),
              ),
              if (hasDot)
                Positioned(
                  top: 11,
                  right: 11,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6D6D),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Theme.of(context).dividerColor),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? const Color(0x18000000)
                    : const Color(0x0D0D1530),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconColor.withValues(alpha: 0.10),
                  border: Border.all(
                    color: iconColor.withValues(alpha: 0.16),
                  ),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 22,
                ),
              ),
              const Spacer(),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  title,
                  maxLines: 1,
                  style: TextStyle(
                    color: isDark
                        ? const Color(0xFFF2F4FB)
                        : const Color(0xFF222430),
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isDark
                      ? const Color(0xFFA7B0C8)
                      : const Color(0xFF9094A8),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  final String title;
  final String value;

  const _InfoBox({
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2438) : const Color(0xFFF7F8FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: isDark ? const Color(0xFFA7B0C8) : const Color(0xFF969AAF),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: isDark ? const Color(0xFFF2F4FB) : const Color(0xFF1D202C),
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardMessage extends StatelessWidget {
  const _DashboardMessage({
    required this.text,
    required this.positive,
  });

  final String text;
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

    final textColor = positive
        ? const Color(0xFF2E8F5B)
        : const Color(0xFFB44A4A);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _AssignedParcelTile extends StatelessWidget {
  const _AssignedParcelTile({
    required this.item,
    required this.statusLabel,
    required this.stageLabel,
    required this.dateLabel,
    required this.statusColor,
    required this.onTap,
  });

  final Map<String, dynamic> item;
  final String statusLabel;
  final String stageLabel;
  final String dateLabel;
  final Color statusColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = _DashboardPalette.of(context);
    final numero = item["numero_suivi"]?.toString() ?? "-";
    final destinataire = item["nom_destinataire"]?.toString() ?? "-";
    final adresse = item["adresse_livraison"]?.toString() ??
        item["adresse"]?.toString() ??
        "-";
    final ordre = item["ordre"]?.toString() ?? "";

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: palette.isDark
                ? const Color(0xFF1A2438)
                : const Color(0xFFF7F8FC),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: statusColor.withValues(alpha: 0.12),
                ),
                child: Icon(
                  Icons.local_shipping_outlined,
                  color: statusColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            numero,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: palette.text,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        if (ordre.isNotEmpty)
                          _ParcelPill(label: "#$ordre", muted: true),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      destinataire,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: palette.text,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      adresse,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: palette.muted,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ParcelPill(label: statusLabel, color: statusColor),
                        _ParcelPill(label: stageLabel, muted: true),
                        if (dateLabel != "-")
                          _ParcelPill(label: dateLabel, muted: true),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right_rounded,
                color: palette.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ParcelPill extends StatelessWidget {
  const _ParcelPill({
    required this.label,
    this.muted = false,
    this.color,
  });

  final String label;
  final bool muted;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final palette = _DashboardPalette.of(context);
    final activeColor = color ?? palette.accent;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: muted
            ? (palette.isDark ? const Color(0xFF111827) : Colors.white)
            : activeColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: muted
              ? Theme.of(context).dividerColor
              : activeColor.withValues(alpha: 0.18),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: muted ? palette.muted : activeColor,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final palette = _DashboardPalette.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: palette.isDark
                ? const Color(0xFF1A2438)
                : const Color(0xFFF7F8FC),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: palette.isDark
                      ? const Color(0xFF251F42)
                      : const Color(0xFFEDE6FF),
                ),
                child: Icon(
                  icon,
                  color: palette.accent,
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
                        color: palette.text,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: palette.muted,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: palette.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}