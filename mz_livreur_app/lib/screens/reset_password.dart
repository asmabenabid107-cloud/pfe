import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/global_theme_toggle.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});
  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final p1 = TextEditingController();
  final p2 = TextEditingController();

  bool loading = false;
  bool show = false;
  String msg = "";

  String email = "";
  String otp = "";
  bool _readArgOnce = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_readArgOnce) return;
    _readArgOnce = true;

    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is Map) {
      if (arg["email"] is String) email = (arg["email"] as String).trim();
      if (arg["otp"] is String) otp = (arg["otp"] as String).trim();
    }
  }

  @override
  void dispose() {
    p1.dispose();
    p2.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    FocusScope.of(context).unfocus();
    setState(() => msg = "");

    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => loading = true);
    try {
      await Api.postJson(
        "/auth/reset-password",
        body: {"email": email, "otp_code": otp, "new_password": p1.text},
        withAuth: false,
      );

      if (!mounted) return;
      Navigator.pushReplacementNamed(
        context,
        "/login",
        arguments: "Mot de passe changé. Connecte-toi maintenant.",
      );
    } on ApiException catch (e) {
      setState(() => msg = e.message);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final maxW = w > 520 ? 520.0 : w;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Nouveau mot de passe",
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
                      border: Border.all(color: const Color(0x24FFFFFF)),
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF0B1430), Color(0xFF070B14)],
                      ),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Définir un nouveau mot de passe",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        SizedBox(height: 8),
                        Opacity(
                          opacity: 0.78,
                          child: Text(
                            "Minimum 6 caractères.",
                            style: TextStyle(
                              color: Colors.white,
                              height: 1.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: p1,
                              enabled: !loading,
                              obscureText: !show,
                              textInputAction: TextInputAction.next,
                              decoration: InputDecoration(
                                labelText: "Nouveau mot de passe",
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  onPressed: loading
                                      ? null
                                      : () => setState(() => show = !show),
                                  icon: Icon(
                                    show
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                  ),
                                ),
                              ),
                              validator: (v) {
                                if ((v ?? "").length < 6)
                                  return "Minimum 6 caractères";
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),

                            TextFormField(
                              controller: p2,
                              enabled: !loading,
                              obscureText: !show,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) =>
                                  loading ? null : submit(),
                              decoration: const InputDecoration(
                                labelText: "Confirmer mot de passe",
                                prefixIcon: Icon(Icons.lock_reset_outlined),
                              ),
                              validator: (v) {
                                if ((v ?? "") != p1.text)
                                  return "Les mots de passe ne correspondent pas";
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),

                            if (msg.isNotEmpty)
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
                                  msg,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            if (msg.isNotEmpty) const SizedBox(height: 12),

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
                                      loading
                                          ? "Enregistrement..."
                                          : "Enregistrer",
                                    ),
                                  ],
                                ),
                              ),
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

