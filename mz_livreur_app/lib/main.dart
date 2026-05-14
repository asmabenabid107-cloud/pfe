import 'package:flutter/material.dart';

import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';
import 'screens/boot.dart';
import 'screens/home.dart';
import 'screens/register.dart';
import 'screens/login.dart';
import 'screens/forgot_password.dart';
import 'screens/verify_otp.dart';
import 'screens/reset_password.dart';
import 'screens/dashboard.dart';
import 'screens/leave_requests.dart';
import 'screens/parcel_overview.dart';
import 'screens/parcel_scan.dart';
import 'screens/parcel_status.dart';
import 'screens/profile.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final controller = ThemeController();
  await controller.load();
  runApp(MyApp(themeController: controller));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.themeController});

  final ThemeController themeController;

  static const _knownRoutes = <String>{
    '/home',
    '/register',
    '/login',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
    '/dashboard',
    '/conges',
    '/profile',
    '/scan',
    '/scan-pickup',
    '/scan-warehouse',
    '/scan-route-progress',
    '/colis-action',
    '/colis-not-delivered',
    '/colis-returned',
  };

  static String _codeFromRoute(String route) {
    final uri = Uri.tryParse(route);
    if (uri == null) return "";

    for (final key in const [
      "code",
      "barcode",
      "barcode_value",
      "numero_suivi",
    ]) {
      final value = uri.queryParameters[key]?.trim();
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }
    return "";
  }

  static String _normalizeStartupRoute(String rawRoute) {
    final raw = rawRoute.trim();
    final uri = Uri.tryParse(raw);

    if (raw.startsWith('/scan') ||
        (uri != null &&
            uri.scheme == 'mzlivreur' &&
            uri.host == 'mz-logistic' &&
            uri.path == '/scan')) {
      final code = _codeFromRoute(raw);
      return code.isEmpty
          ? '/scan'
          : '/scan?code=${Uri.encodeQueryComponent(code)}';
    }

    if (raw.startsWith('/colis-action') ||
        (uri != null &&
            uri.scheme == 'mzlivreur' &&
            uri.host == 'mz-logistic' &&
            uri.path == '/colis-action')) {
      final code = _codeFromRoute(raw);
      return code.isEmpty
          ? '/colis-action'
          : '/colis-action?code=${Uri.encodeQueryComponent(code)}';
    }

    return _knownRoutes.contains(raw) ? raw : '/home';
  }

  static String _codeFromArguments(Object? args) {
    if (args is String) return args;
    if (args is Map && args["code"] != null) return args["code"].toString();
    return "";
  }

  static Map<String, dynamic>? _colisFromArguments(Object? args) {
    if (args is Map && args["colis"] is Map) {
      return Map<String, dynamic>.from(args["colis"] as Map);
    }
    return null;
  }

  Route<dynamic>? _generateRoute(RouteSettings settings) {
    final routeName = settings.name ?? '';
    final normalized = _normalizeStartupRoute(routeName);
    if (normalized.startsWith('/scan')) {
      final argumentCode = _codeFromArguments(settings.arguments);
      final routeCode = _codeFromRoute(normalized);
      final code = argumentCode.isNotEmpty ? argumentCode : routeCode;
      return MaterialPageRoute(
        settings: RouteSettings(
          name: normalized,
          arguments: settings.arguments,
        ),
        builder: (_) => ParcelScanScreen(initialCode: code),
      );
    }
    if (normalized.startsWith('/colis-action')) {
      final argumentCode = _codeFromArguments(settings.arguments);
      final routeCode = _codeFromRoute(normalized);
      final code = argumentCode.isNotEmpty ? argumentCode : routeCode;
      return MaterialPageRoute(
        settings: RouteSettings(
          name: normalized,
          arguments: settings.arguments,
        ),
        builder: (_) => ParcelStatusScreen(
          initialCode: code,
          initialData: _colisFromArguments(settings.arguments),
        ),
      );
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return ThemeControllerScope(
      controller: themeController,
      child: AnimatedBuilder(
        animation: themeController,
        builder: (context, _) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'MZ Livreur',
            themeMode: themeController.mode,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            onGenerateInitialRoutes: (String initialRoute) {
              final normalizedRoute = _normalizeStartupRoute(initialRoute);
              return [
                MaterialPageRoute(
                  settings: const RouteSettings(name: '/boot'),
                  builder: (_) => BootScreen(initialRoute: normalizedRoute),
                ),
              ];
            },
            routes: {
              '/home': (_) => const HomeScreen(),
              '/register': (_) => const RegisterScreen(),
              '/login': (_) => const LoginScreen(),
              '/forgot-password': (_) => const ForgotPasswordScreen(),
              '/verify-otp': (_) => const VerifyOtpScreen(),
              '/reset-password': (_) => const ResetPasswordScreen(),
              '/dashboard': (_) => const DashboardScreen(),
              '/conges': (_) => const LeaveRequestsScreen(),
              '/profile': (_) => const ProfileScreen(),
              '/scan': (_) => const ParcelScanScreen(),
              '/scan-pickup': (_) => const ParcelScanScreen(),
              '/scan-warehouse': (_) => const ParcelScanScreen(),
              '/scan-route-progress': (_) => const ParcelScanScreen(),
              '/colis-action': (_) => const ParcelStatusScreen(),
              '/colis-not-delivered': (_) => const ParcelOverviewScreen(
                mode: ParcelOverviewMode.notDelivered,
              ),
              '/colis-returned': (_) =>
                  const ParcelOverviewScreen(mode: ParcelOverviewMode.returned),
            },
            onGenerateRoute: _generateRoute,
            onUnknownRoute: (_) =>
                MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        },
      ),
    );
  }
}
