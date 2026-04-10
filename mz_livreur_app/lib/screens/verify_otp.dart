import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/global_theme_toggle.dart';

class VerifyOtpScreen extends StatefulWidget {
  const VerifyOtpScreen({super.key});
  @override
  State<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends State<VerifyOtpScreen> {
  final _formKey = GlobalKey<FormState>();
  final otp = TextEditingController();

  bool loading = false;
  String msg = "";

  String email = "";
  bool _readArgOnce = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_readArgOnce) return;
    _readArgOnce = true;

    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is Map && arg["email"] is String) {
      email = (arg["email"] as String).trim();
    }
  }

  @override
  void dispose() {
    otp.dispose();
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
        "/auth/verify-otp",
        body: {"email": email, "otp_code": otp.text.trim()},
        withAuth: false,
      );

      if (!mounted) return;
      Navigator.pushNamed(
        context,
        "/reset-password",
        arguments: {"email": email, "otp": otp.text.trim()},
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
          "Vérifier OTP",
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Entre le code reçu",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Opacity(
                          opacity: 0.78,
                          child: Text(
                            email.isEmpty ? "Email: —" : "Email: $email",
                            style: const TextStyle(
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
                              controller: otp,
                              enabled: !loading,
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) =>
                                  loading ? null : submit(),
                              decoration: const InputDecoration(
                                labelText: "Code OTP (6 chiffres)",
                                prefixIcon: Icon(Icons.verified_outlined),
                              ),
                              validator: (v) {
                                final s = (v ?? "").trim();
                                if (s.length != 6)
                                  return "Le code doit contenir 6 chiffres";
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
                                      loading ? "Vérification..." : "Vérifier",
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

