import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'providers/auth_provider.dart';
import 'providers/navigation_provider.dart';
import 'pages/auth/login_page.dart';
import 'pages/dashboard/dashboard_page.dart';
import 'pages/splash_page.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase is only initialized on non-web platforms.
  // Web requires explicit FirebaseOptions (google-services web config).
  // For now, FCM / Crashlytics are mobile-only features.
  if (!kIsWeb) {
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('Firebase init skipped: $e');
    }
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NavigationProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Use Consumer so we get a child BuildContext that IS a descendant
    // of the MultiProvider — not the MyApp context which is its sibling.
    return Consumer<NavigationProvider>(
      builder: (context, navProvider, _) => MaterialApp(
        title: 'WorkHub',
        navigatorKey: NavigationProvider.navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: navProvider.themeMode,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    // 1. Loading state (syncs profile from server)
    if (authProvider.isLoading && !authProvider.isAuthenticated) {
      return const SplashPage(statusText: 'Connecting to WorkHub...');
    }

    // 2. Authenticated routing
    if (authProvider.isAuthenticated) {
      return const DashboardPage();
    }

    // 3. Unauthenticated routing
    return const LoginPage();
  }
}
