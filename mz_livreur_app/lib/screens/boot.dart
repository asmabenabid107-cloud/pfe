import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/storage.dart';

class BootScreen extends StatefulWidget {
  final String initialRoute;
  const BootScreen({super.key, required this.initialRoute});

  @override
  State<BootScreen> createState() => _BootScreenState();
}

class _BootScreenState extends State<BootScreen> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    String? token;
    try {
      token = await Storage.getToken();
    } catch (_) {
      token = null;
    }

    if (!mounted) return;

    final loggedIn = token != null && token.trim().isNotEmpty;
    if (!loggedIn) {
      Navigator.pushNamedAndRemoveUntil(
        context,
        widget.initialRoute,
        (_) => false,
      );
      return;
    }

    try {
      await Api.getJson("/auth/me", withAuth: true);
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, "/dashboard", (_) => false);
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

      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, "/dashboard", (_) => false);
    } catch (_) {
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, "/dashboard", (_) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
