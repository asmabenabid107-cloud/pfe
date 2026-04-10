import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/global_theme_toggle.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final email = TextEditingController();

  bool loading = false;
  String msg = "";

  @override
  void dispose() {
    email.dispose();
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
        "/auth/forgot-password",
        body: {"email": email.text.trim()},
        withAuth: false,
      );

      if (!mounted) return;
      Navigator.pushNamed(
        context,
        "/verify-otp",
        arguments: {"email": email.text.trim()},
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
          "Mot de passe oublié",
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
                          "Recevoir un code OTP",
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
                            "Un code sera envoyé sur ton email.",
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
                              controller: email,
                              enabled: !loading,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) =>
                                  loading ? null : submit(),
                              decoration: const InputDecoration(
                                labelText: "Email",
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                              validator: (v) {
                                final s = (v ?? "").trim();
                                if (!s.contains("@") || !s.contains("."))
                                  return "Email invalide";
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
                                      loading ? "Envoi..." : "Envoyer le code",
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

