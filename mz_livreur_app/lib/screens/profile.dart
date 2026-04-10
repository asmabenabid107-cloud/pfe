import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/storage.dart';
import '../widgets/global_theme_toggle.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final email = TextEditingController();
  final phone = TextEditingController(text: "+216 ");

  bool loading = true;
  bool saving = false;
  String msg = "";
  Map<String, dynamic>? me;

  @override
  void initState() {
    super.initState();
    phone.addListener(_formatPhoneLive);
    loadProfile();
  }

  @override
  void dispose() {
    phone.removeListener(_formatPhoneLive);
    name.dispose();
    email.dispose();
    phone.dispose();
    super.dispose();
  }

  void _setPhone(String value) {
    if (phone.text == value) {
      return;
    }
    phone.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  String _formatLocalPhone(String local) {
    if (local.isEmpty) return "";
    if (local.length <= 2) return local;
    if (local.length <= 5) {
      return "${local.substring(0, 2)} ${local.substring(2)}";
    }
    return "${local.substring(0, 2)} ${local.substring(2, 5)} ${local.substring(5)}";
  }

  void _formatPhoneLive() {
    final raw = phone.text;

    if (!raw.startsWith("+216")) {
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      final local = digits.startsWith("216") ? digits.substring(3) : digits;
      _setPhone("+216 ${_formatLocalPhone(local)}");
      return;
    }

    final digits = raw.replaceFirst("+216", "").replaceAll(RegExp(r'\D'), '');
    final local = digits.length > 8 ? digits.substring(0, 8) : digits;
    _setPhone("+216 ${_formatLocalPhone(local)}");
  }

  String _cleanPhone(String value) => value.replaceAll(" ", "");

  bool _validPhone(String value) {
    return RegExp(r'^\+216\d{8}$').hasMatch(_cleanPhone(value));
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

  Future<void> _handleSessionError(ApiException e) async {
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
  }

  Future<void> loadProfile() async {
    setState(() {
      loading = true;
      msg = "";
    });

    try {
      final data = await Api.getJson("/auth/me", withAuth: true);
      setState(() {
        me = data;
        name.text = data["name"]?.toString() ?? "";
        email.text = data["email"]?.toString() ?? "";
        final rawPhone = data["phone"]?.toString() ?? "+216 ";
        _setPhone(rawPhone.startsWith("+216") ? rawPhone : "+216 ");
        _formatPhoneLive();
      });
    } on ApiException catch (e) {
      await _handleSessionError(e);
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  Future<void> saveProfile() async {
    FocusScope.of(context).unfocus();
    setState(() => msg = "");

    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) {
      return;
    }

    setState(() => saving = true);
    try {
      final data = await Api.patchJson(
        "/auth/me",
        body: {
          "full_name": name.text.trim(),
          "email": email.text.trim(),
          "phone": _cleanPhone(phone.text),
        },
      );

      setState(() {
        me = data;
        msg = "Profil mis a jour avec succes.";
      });
    } on ApiException catch (e) {
      await _handleSessionError(e);
    } finally {
      if (mounted) {
        setState(() => saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final region = me?["assigned_region"]?.toString().trim();
    final status = me?["courier_status"]?.toString() ?? "active";
    final contractEndDate = me?["contract_end_date"]?.toString();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Mon profil",
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: [
          const ThemeIconButton(),
          IconButton(onPressed: loadProfile, icon: const Icon(Icons.refresh)),
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

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _Badge(
                            label: region != null && region.isNotEmpty
                                ? region
                                : "Region non assignee",
                          ),
                          _Badge(label: status),
                          _Badge(
                            label:
                                contractEndDate == null ||
                                    contractEndDate.isEmpty
                                ? "Contrat non defini"
                                : "Fin: ${_formatDate(contractEndDate)}",
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              "Modifier mes informations",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: name,
                              enabled: !saving,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Nom complet",
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                              validator: (value) {
                                final text = (value ?? "").trim();
                                if (text.length < 2) {
                                  return "Nom invalide";
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: email,
                              enabled: !saving,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: "Email",
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                              validator: (value) {
                                final text = (value ?? "").trim();
                                if (!text.contains("@") ||
                                    !text.contains(".")) {
                                  return "Email invalide";
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: phone,
                              enabled: !saving,
                              keyboardType: TextInputType.phone,
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
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 48,
                              child: FilledButton(
                                onPressed: saving ? null : saveProfile,
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
                                      saving
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
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;

  const _Badge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0x24FFFFFF)),
        color: const Color(0x10FFFFFF),
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
      ),
    );
  }
}
