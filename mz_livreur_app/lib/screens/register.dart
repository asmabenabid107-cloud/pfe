import 'package:flutter/material.dart';

import '../core/api.dart';
import '../widgets/global_theme_toggle.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final name = TextEditingController();
  final email = TextEditingController();
  final phone = TextEditingController(text: "+216 ");
  final password = TextEditingController();

  bool loading = false;
  bool showPassword = false;
  String msg = "";

  @override
  void initState() {
    super.initState();
    phone.addListener(_formatPhoneLive);
  }

  @override
  void dispose() {
    phone.removeListener(_formatPhoneLive);
    name.dispose();
    email.dispose();
    phone.dispose();
    password.dispose();
    super.dispose();
  }

  void _formatPhoneLive() {
    final raw = phone.text;

    if (!raw.startsWith("+216")) {
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      final local = digits.startsWith("216") ? digits.substring(3) : digits;
      _setPhone("+216 ${_fmtLocal(local)}");
      return;
    }

    final after = raw.replaceFirst("+216", "");
    final digits = after.replaceAll(RegExp(r'\D'), '');
    final local = digits.length > 8 ? digits.substring(0, 8) : digits;
    _setPhone("+216 ${_fmtLocal(local)}");
  }

  String _fmtLocal(String local) {
    if (local.isEmpty) return "";
    if (local.length <= 2) return local;
    if (local.length <= 5) {
      return "${local.substring(0, 2)} ${local.substring(2)}";
    }

    final a = local.substring(0, 2);
    final b = local.substring(2, 5);
    final c = local.substring(5);
    return "$a $b $c";
  }

  void _setPhone(String value) {
    if (phone.text == value) return;
    phone.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  String _cleanPhone(String value) => value.replaceAll(" ", "");

  bool _validPhone(String value) {
    final clean = _cleanPhone(value);
    return RegExp(r'^\+216\d{8}$').hasMatch(clean);
  }

  bool _validPassword(String value) {
    return RegExp(r'^[A-Za-z]{6,}$').hasMatch(value.trim());
  }

  Future<void> submit() async {
    FocusScope.of(context).unfocus();
    setState(() => msg = "");

    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => loading = true);
    try {
      await Api.postJson(
        "/auth/courier/register",
        body: {
          "full_name": name.text.trim(),
          "email": email.text.trim(),
          "phone": _cleanPhone(phone.text),
          "password": password.text.trim(),
        },
        withAuth: false,
      );

      if (!mounted) return;

      Navigator.pushReplacementNamed(
        context,
        "/login",
        arguments:
            "Inscription recue. Attends la confirmation de l admin. Un email sera envoye apres validation.",
      );
    } on ApiException catch (e) {
      setState(() => msg = e.message);
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final maxWidth = width > 520 ? 520.0 : width;
    final theme = Theme.of(context);
    final isLight = theme.brightness == Brightness.light;
    final headerTitleColor = isLight ? const Color(0xFF162033) : Colors.white;
    final headerBodyColor = isLight
        ? const Color(0xCC162033)
        : Colors.white.withValues(alpha: 0.78);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Inscription Livreur",
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: const [ThemeIconButton()],
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: SizedBox(
            width: maxWidth,
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
                        color: isLight
                            ? const Color(0xFFE1E6F0)
                            : const Color(0x24FFFFFF),
                      ),
                      color: isLight ? Colors.white : null,
                      gradient: isLight
                          ? null
                          : const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF0B1430), Color(0xFF070B14)],
                            ),
                      boxShadow: isLight
                          ? const [
                              BoxShadow(
                                color: Color(0x14243E62),
                                blurRadius: 24,
                                offset: Offset(0, 12),
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Creer un compte",
                          style: TextStyle(
                            color: headerTitleColor,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Le compte doit etre approuve par l admin avant acces au dashboard.",
                          style: TextStyle(
                            color: headerBodyColor,
                            height: 1.5,
                            fontWeight: FontWeight.w600,
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
                              controller: name,
                              enabled: !loading,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Nom complet",
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                              validator: (value) {
                                final text = (value ?? "").trim();
                                if (text.length < 2) return "Nom invalide";
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: email,
                              enabled: !loading,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Email",
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                              validator: (value) {
                                final text = (value ?? "").trim();
                                if (!text.contains("@") || !text.contains(".")) {
                                  return "Email invalide";
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: phone,
                              enabled: !loading,
                              keyboardType: TextInputType.phone,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Telephone",
                                hintText: "+216 12 345 678",
                                prefixIcon: Icon(Icons.phone_outlined),
                              ),
                              validator: (value) {
                                final text = (value ?? "").trim();
                                if (!_validPhone(text)) {
                                  return "Telephone invalide (+216 + 8 chiffres)";
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
                              onFieldSubmitted: (_) => loading ? null : submit(),
                              decoration: InputDecoration(
                                labelText: "Mot de passe",
                                hintText: "Minimum 6 lettres",
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
                              validator: (value) {
                                final text = value ?? "";
                                if (!_validPassword(text)) {
                                  return "Le mot de passe doit contenir au moins 6 lettres";
                                }
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
                                      loading ? "Creation..." : "Creer compte",
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
                                        "/login",
                                      ),
                              child: const Text("J ai deja un compte"),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Opacity(
                    opacity: 0.7,
                    child: Text(
                      "Apres validation admin, un email sera envoye puis connexion possible.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        height: 1.5,
                        fontWeight: FontWeight.w600,
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
