import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/global_theme_toggle.dart';
import '../core/storage.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();

  bool loading = false;
  bool showPassword = false;

  String err = "";
  String info = "";
  bool _readArgOnce = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_readArgOnce) {
      return;
    }
    _readArgOnce = true;

    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is String && arg.trim().isNotEmpty) {
      info = arg.trim();
      setState(() {});
    }
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    FocusScope.of(context).unfocus();
    setState(() => err = "");

    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) {
      return;
    }

    setState(() => loading = true);
    try {
      final data = await Api.postJson(
        "/auth/courier/login",
        body: {"email": email.text.trim(), "password": password.text},
        withAuth: false,
      );

      final token = data["access_token"]?.toString().trim();
      if (token == null || token.isEmpty) {
        setState(() => err = "Token manquant");
        return;
      }

      await Storage.setToken(token);
      if (!mounted) {
        return;
      }

      Navigator.pushNamedAndRemoveUntil(context, "/dashboard", (_) => false);
    } on ApiException catch (e) {
      setState(() => err = e.message);
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final maxW = w > 520 ? 520.0 : w;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headerText = isDark ? Colors.white : const Color(0xFF1B1D27);
    final headerMuted = isDark ? Colors.white : const Color(0xFF5B6478);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Connexion Livreur",
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: const [ThemeIconButton()],
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: SizedBox(
            width: maxW,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark
                            ? const Color(0x24FFFFFF)
                            : const Color(0xFFE3E8F3),
                      ),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: isDark
                            ? const [Color(0xFF0B1430), Color(0xFF070B14)]
                            : const [Colors.white, Color(0xFFF8FAFF)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isDark
                              ? const Color(0x14000000)
                              : const Color(0x120D1530),
                          blurRadius: 18,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Se connecter",
                          style: TextStyle(
                            color: headerText,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Opacity(
                          opacity: 0.9,
                          child: Text(
                            "Connecte-toi après validation admin (email envoyé).",
                            style: TextStyle(
                              color: headerMuted,
                              height: 1.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (info.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0x662D5BFF)),
                        color: const Color(0x142D5BFF),
                      ),
                      child: Text(
                        info,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          height: 1.5,
                        ),
                      ),
                    ),
                  if (info.isNotEmpty) const SizedBox(height: 12),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: email,
                              enabled: !loading,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Email",
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                              validator: (v) {
                                final s = (v ?? "").trim();
                                if (!s.contains("@") || !s.contains(".")) {
                                  return "Email invalide";
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),

                            TextFormField(
                              controller: password,
                              enabled: !loading,
                              obscureText: !showPassword,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) =>
                                  loading ? null : submit(),
                              decoration: InputDecoration(
                                labelText: "Mot de passe",
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  onPressed: loading
                                      ? null
                                      : () => setState(
                                          () => showPassword = !showPassword,
                                        ),
                                  icon: Icon(
                                    showPassword
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                  ),
                                ),
                              ),
                              validator: (v) {
                                if ((v ?? "").length < 6) {
                                  return "Minimum 6 caractères";
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 10),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: loading
                                    ? null
                                    : () => Navigator.pushNamed(
                                        context,
                                        "/forgot-password",
                                      ),
                                child: const Text("Mot de passe oublié ?"),
                              ),
                            ),

                            if (err.isNotEmpty) const SizedBox(height: 6),
                            if (err.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: const Color(0x80FF5F5F),
                                  ),
                                  color: const Color(0x14FF5F5F),
                                ),
                                child: Text(
                                  err,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),

                            const SizedBox(height: 14),

                            SizedBox(
                              height: 48,
                              child: FilledButton(
                                onPressed: loading ? null : submit,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    if (loading)
                                      const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    if (loading) const SizedBox(width: 12),
                                    Text(
                                      loading ? "Connexion..." : "Se connecter",
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 10),

                            OutlinedButton(
                              onPressed: loading
                                  ? null
                                  : () => Navigator.pushReplacementNamed(
                                      context,
                                      "/register",
                                    ),
                              child: const Text("Créer un compte"),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
