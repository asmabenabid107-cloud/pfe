import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/storage.dart';
import '../theme/theme_controller.dart';
import '../widgets/global_theme_toggle.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool loading = true;
  String msg = "";
  Map<String, dynamic>? me;

  @override
  void initState() {
    super.initState();
    loadMe();
  }

  Future<void> loadMe() async {
    setState(() {
      loading = true;
      msg = "";
    });

    try {
      final data = await Api.getJson("/auth/me", withAuth: true);
      setState(() => me = data);
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

  Future<void> logout() async {
    await Storage.clearToken();
    if (!mounted) {
      return;
    }
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
                              Icons.close_rounded,
                              color: palette.muted,
                            ),
                            splashRadius: 18,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    GridView.count(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      childAspectRatio: 1.08,
                      children: [
                        _QuickCard(
                          icon: Icons.assignment_outlined,
                          iconColor: const Color(0xFF4ED2A8),
                          title: "Mon profil",
                          subtitle: "Modifier mes donnees",
                          onTap: () => Navigator.pushNamed(context, "/profile"),
                        ),
                        _QuickCard(
                          icon: Icons.event_note_outlined,
                          iconColor: const Color(0xFF398BFF),
                          title: "Mes conges",
                          subtitle: "Demandes et historique",
                          onTap: () => Navigator.pushNamed(context, "/conges"),
                        ),
                        _QuickCard(
                          icon: Icons.map_outlined,
                          iconColor: const Color(0xFFFE8B65),
                          title: "Region",
                          subtitle: region != null && region.isNotEmpty
                              ? region
                              : "Non assignee",
                          onTap: () => Navigator.pushNamed(context, "/profile"),
                        ),
                        _QuickCard(
                          icon: Icons.verified_user_outlined,
                          iconColor: _statusColor(status),
                          title: "Statut",
                          subtitle: statusLabel,
                          onTap: () => Navigator.pushNamed(context, "/conges"),
                        ),
                      ],
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
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
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
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
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
          padding: const EdgeInsets.all(16),
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
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconColor.withValues(alpha: 0.10),
                  border: Border.all(color: iconColor.withValues(alpha: 0.16)),
                ),
                child: Icon(icon, color: iconColor),
              ),
              const Spacer(),
              Text(
                title,
                style: TextStyle(
                  color: isDark
                      ? const Color(0xFFF2F4FB)
                      : const Color(0xFF222430),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: isDark
                      ? const Color(0xFFA7B0C8)
                      : const Color(0xFF9094A8),
                  fontWeight: FontWeight.w600,
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

  const _InfoBox({required this.title, required this.value});

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
                child: Icon(icon, color: palette.accent),
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
                      style: TextStyle(color: palette.muted, height: 1.3),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: palette.muted),
            ],
          ),
        ),
      ),
    );
  }
}
