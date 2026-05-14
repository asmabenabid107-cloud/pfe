import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/global_theme_toggle.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool introDone = false;
  Timer? _timer;
  int _tick = 0;

  int colis = 0;
  int partenaires = 0;
  int satisfaction = 0;
  int villes = 0;

  @override
  void initState() {
    super.initState();

    Future.delayed(const Duration(milliseconds: 2600), () {
      if (!mounted) {
        return;
      }
      setState(() => introDone = true);
    });

    _timer = Timer.periodic(const Duration(milliseconds: 40), (_) {
      _tick += 10;

      final nextColis = _tick * 5;
      final nextPartenaires = (_tick / 2).clamp(0, 35).toInt();
      final nextSatisfaction = _tick.clamp(0, 98);
      final nextVilles = (_tick / 30).clamp(0, 3).toInt();

      if (!mounted) {
        return;
      }

      setState(() {
        colis = nextColis;
        partenaires = nextPartenaires;
        satisfaction = nextSatisfaction;
        villes = nextVilles;
      });

      if (_tick >= 100) {
        _timer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (_, constraints) {
            final contentWidth = constraints.maxWidth > 1040
                ? 1040.0
                : constraints.maxWidth;

            return Align(
              alignment: Alignment.topCenter,
              child: SizedBox(
                width: contentWidth,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _NavBar(
                        onRegister: () =>
                            Navigator.pushNamed(context, '/register'),
                        onLogin: () => Navigator.pushNamed(context, '/login'),
                      ),
                      const SizedBox(height: 18),
                      _Hero(introDone: introDone),
                      const SizedBox(height: 18),
                      _StatsGrid(
                        colis: colis,
                        partenaires: partenaires,
                        satisfaction: satisfaction,
                        villes: villes,
                      ),
                      const SizedBox(height: 18),
                      const _Section(
                        title: 'Nos Services',
                        children: [
                          _ListItem('Livraison e-commerce (B2C)'),
                          _ListItem('Collecte et expedition'),
                          _ListItem('Suivi des colis'),
                          _ListItem(
                            'Transport securise pour produits fragiles',
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const _Section(
                        title: 'Technologie et innovation',
                        children: [
                          Text(
                            "Inscription puis validation admin. Email envoye apres validation. Connexion puis dashboard.",
                            style: TextStyle(
                              height: 1.7,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(height: 10),
                          _ListItem('Application mobile livreur'),
                          _ListItem('Mise a jour rapide des statuts'),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const _Section(
                        title: 'Zones couvertes',
                        children: [
                          _ListItem('Kairouan'),
                          _ListItem('Sousse'),
                          _ListItem('Livraison nationale via partenaires'),
                        ],
                      ),
                      const SizedBox(height: 18),
                      _CTABox(
                        onRegister: () =>
                            Navigator.pushNamed(context, '/register'),
                      ),
                      const SizedBox(height: 18),
                      const _Section(
                        title: 'Contact',
                        children: [
                          _ListItem('Telephone: +216 XX XXX XXX'),
                          _ListItem('Email: contact@mzlogistic.tn'),
                          _ListItem('Adresse: Kairouan, Tunisie'),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Opacity(
                        opacity: 0.7,
                        child: Text(
                          "© ${DateTime.now().year} MZ Logistic - Tous droits reserves.",
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _HomePalette {
  const _HomePalette({
    required this.isDark,
    required this.pageBg,
    required this.navBg,
    required this.navBorder,
    required this.navText,
    required this.navButtonBorder,
    required this.sectionBg,
    required this.sectionBorder,
    required this.insetBg,
    required this.heroBorder,
    required this.heroGradient,
    required this.heroText,
    required this.heroMuted,
    required this.heroCardBg,
    required this.heroCardBorder,
    required this.cardShadow,
    required this.text,
    required this.muted,
  });

  factory _HomePalette.of(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return _HomePalette(
      isDark: isDark,
      pageBg: theme.scaffoldBackgroundColor,
      navBg: isDark ? const Color(0xFF161F33) : Colors.white,
      navBorder: isDark ? const Color(0x332D5BFF) : const Color(0xFFE3E8F3),
      navText: isDark ? Colors.white : const Color(0xFF1B1D27),
      navButtonBorder: isDark
          ? const Color(0x44FFFFFF)
          : const Color(0xFFD0D8E7),
      sectionBg: theme.cardColor,
      sectionBorder: theme.dividerColor,
      insetBg: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFF0F2F7),
      heroBorder: isDark ? const Color(0x33FFFFFF) : const Color(0x220B1430),
      heroGradient: isDark
          ? const [Color(0xFF0B1430), Color(0xFF070B14)]
          : const [Colors.white, Color(0xFFF8FAFF)],
      heroText: isDark ? Colors.white : const Color(0xFF1B1D27),
      heroMuted: isDark ? const Color(0xE6FFFFFF) : const Color(0xFF5B6478),
      heroCardBg: isDark ? const Color(0x12FFFFFF) : Colors.white,
      heroCardBorder: isDark
          ? const Color(0x24FFFFFF)
          : const Color(0xFFE3E8F3),
      cardShadow: BoxShadow(
        color: isDark ? const Color(0x24000000) : const Color(0x120D1530),
        blurRadius: 20,
        offset: const Offset(0, 10),
      ),
      text: theme.textTheme.bodyLarge?.color ?? const Color(0xFF1B1D27),
      muted: isDark ? const Color(0xFFA7B0C8) : const Color(0xFF8C90A3),
    );
  }

  final bool isDark;
  final Color pageBg;
  final Color navBg;
  final Color navBorder;
  final Color navText;
  final Color navButtonBorder;
  final Color sectionBg;
  final Color sectionBorder;
  final Color insetBg;
  final Color heroBorder;
  final List<Color> heroGradient;
  final Color heroText;
  final Color heroMuted;
  final Color heroCardBg;
  final Color heroCardBorder;
  final BoxShadow cardShadow;
  final Color text;
  final Color muted;
}

class _NavBar extends StatelessWidget {
  final VoidCallback onRegister;
  final VoidCallback onLogin;

  const _NavBar({required this.onRegister, required this.onLogin});

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);
    final compact = MediaQuery.of(context).size.width < 430;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: palette.navBg,
        border: Border.all(color: palette.navBorder),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [palette.cardShadow],
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const _NavDot(),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'MZ Logistic',
                        style: TextStyle(
                          color: palette.navText,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const ThemeChipButton(),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onLogin,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: palette.navText,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          side: BorderSide(color: palette.navButtonBorder),
                        ),
                        child: const Text('Se connecter'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        onPressed: onRegister,
                        child: const Text("S'inscrire"),
                      ),
                    ),
                  ],
                ),
              ],
            )
          : Row(
              children: [
                const _NavDot(),
                const SizedBox(width: 10),
                Text(
                  'MZ Logistic',
                  style: TextStyle(
                    color: palette.navText,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Spacer(),
                const ThemeChipButton(),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: onLogin,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: palette.navText,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    side: BorderSide(color: palette.navButtonBorder),
                  ),
                  child: const Text('Se connecter'),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: onRegister,
                  child: const Text("S'inscrire"),
                ),
              ],
            ),
    );
  }
}

class _NavDot extends StatelessWidget {
  const _NavDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: const Color(0xFF7AA2FF),
        boxShadow: const [
          BoxShadow(color: Color(0x337AA2FF), blurRadius: 0, spreadRadius: 6),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final bool introDone;

  const _Hero({required this.introDone});

  @override
  Widget build(BuildContext context) {
    final small = MediaQuery.of(context).size.width < 520;
    final palette = _HomePalette.of(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: palette.heroBorder),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: palette.heroGradient,
        ),
        boxShadow: [palette.cardShadow],
      ),
      child: Stack(
        children: [
          AnimatedOpacity(
            opacity: introDone ? 0 : 1,
            duration: const Duration(milliseconds: 500),
            child: SizedBox(
              height: 260,
              child: Stack(
                children: [
                  const Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: _Road(),
                  ),
                  TweenAnimationBuilder<double>(
                    tween: Tween(
                      begin: -120,
                      end: MediaQuery.of(context).size.width + 120,
                    ),
                    duration: const Duration(milliseconds: 2400),
                    curve: Curves.easeInOut,
                    builder: (context, x, child) {
                      return Positioned(
                        bottom: 44,
                        left: x,
                        child: const Text('🚚', style: TextStyle(fontSize: 56)),
                      );
                    },
                  ),
                  Positioned.fill(
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'MZ Logistic',
                            style: TextStyle(
                              color: palette.heroText,
                              fontSize: 36,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Opacity(
                            opacity: 0.9,
                            child: Text(
                              'Transport - Suivi - Fiabilite',
                              style: TextStyle(color: palette.heroMuted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedOpacity(
            opacity: introDone ? 1 : 0,
            duration: const Duration(milliseconds: 500),
            child: Column(
              children: [
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const _LogoBadge(),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MZ Logistic',
                          style: TextStyle(
                            color: palette.heroText,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Opacity(
                          opacity: 0.9,
                          child: Text(
                            'Application Livreur',
                            style: TextStyle(color: palette.heroMuted),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'Inscris-toi, attends la confirmation admin, puis connecte-toi.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: palette.heroText,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    FilledButton(
                      onPressed: () =>
                          Navigator.pushNamed(context, '/register'),
                      child: const Text("S'inscrire"),
                    ),
                    OutlinedButton(
                      onPressed: () => Navigator.pushNamed(context, '/login'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: palette.heroText,
                        side: BorderSide(color: palette.navButtonBorder),
                      ),
                      child: const Text('Se connecter'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: small ? 1 : 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: small ? 3.0 : 1.25,
                  children: const [
                    _FeatureCard(
                      title: 'Suivi clair',
                      text: 'Statut terrain en temps reel.',
                    ),
                    _FeatureCard(
                      title: 'Rapide',
                      text: 'Mise a jour immediate.',
                    ),
                    _FeatureCard(
                      title: 'Securise',
                      text: 'Validation admin + email.',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Road extends StatelessWidget {
  const _Road();

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);

    return Container(
      height: 86,
      decoration: BoxDecoration(
        color: palette.isDark
            ? const Color(0x59000000)
            : const Color(0xFFF4F7FC),
        border: Border(top: BorderSide(color: palette.heroCardBorder)),
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}

class _LogoBadge extends StatelessWidget {
  const _LogoBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: const Color(0x402D5BFF),
        border: Border.all(color: const Color(0x662D5BFF)),
      ),
      child: const Center(
        child: Text(
          'MZ',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final int colis;
  final int partenaires;
  final int satisfaction;
  final int villes;

  const _StatsGrid({
    required this.colis,
    required this.partenaires,
    required this.satisfaction,
    required this.villes,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, constraints) {
        final cols = constraints.maxWidth >= 860 ? 4 : 2;
        final aspectRatio = cols == 4
            ? 1.55
            : constraints.maxWidth < 420
            ? 1.08
            : 1.25;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _HomePalette.of(context).sectionBorder),
            color: _HomePalette.of(context).sectionBg,
            boxShadow: [_HomePalette.of(context).cardShadow],
          ),
          child: GridView.count(
            crossAxisCount: cols,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: aspectRatio,
            children: [
              _StatBox(value: '+$colis', label: 'Colis livres'),
              _StatBox(value: '+$partenaires', label: 'Partenaires'),
              _StatBox(value: '$satisfaction%', label: 'Satisfaction client'),
              _StatBox(value: '$villes', label: 'Villes couvertes'),
            ],
          ),
        );
      },
    );
  }
}

class _StatBox extends StatelessWidget {
  final String value;
  final String label;

  const _StatBox({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final valueSize = constraints.maxWidth < 120 ? 24.0 : 30.0;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: palette.sectionBorder),
            color: palette.insetBg,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: valueSize,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF7AA2FF),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 6),
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: palette.text,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CTABox extends StatelessWidget {
  final VoidCallback onRegister;

  const _CTABox({required this.onRegister});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _HomePalette.of(context).sectionBorder),
        color: _HomePalette.of(context).sectionBg,
        boxShadow: [_HomePalette.of(context).cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Pret a commencer ?',
            style: TextStyle(
              color: _HomePalette.of(context).text,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            "Apres inscription, le compte doit etre approuve par l'admin. Un email sera envoye apres validation.",
            style: TextStyle(
              color: _HomePalette.of(context).text,
              height: 1.6,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: onRegister,
            child: const Text('Creer un compte livreur'),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.sectionBorder),
        color: palette.sectionBg,
        boxShadow: [palette.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: palette.text,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          DefaultTextStyle.merge(
            style: TextStyle(color: palette.text),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

class _ListItem extends StatelessWidget {
  final String text;

  const _ListItem(this.text);

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: palette.sectionBorder),
        color: palette.insetBg,
      ),
      child: Text(
        text,
        style: TextStyle(
          color: palette.text,
          fontWeight: FontWeight.w700,
          height: 1.4,
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final String text;

  const _FeatureCard({required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    final palette = _HomePalette.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.heroCardBorder),
        color: palette.heroCardBg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: TextStyle(
              color: palette.heroText,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          const SizedBox.shrink(),
          Text(text, style: TextStyle(color: palette.heroMuted, height: 1.5)),
        ],
      ),
    );
  }
}
