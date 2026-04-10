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
  };

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
              return [
                MaterialPageRoute(
                  settings: const RouteSettings(name: '/boot'),
                  builder: (_) => BootScreen(
                    initialRoute: _knownRoutes.contains(initialRoute)
                        ? initialRoute
                        : '/home',
                  ),
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
            },
            onUnknownRoute: (_) =>
                MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        },
      ),
    );
  }
}
