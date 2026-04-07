import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'config/config.dart';
import 'core/app_theme.dart';
import 'services/service_locator.dart';
import 'providers/auth_provider.dart';
import 'providers/user_provider.dart';
import 'providers/payment_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/payment/payment_screen.dart';
import 'screens/payment/payment_status_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/transactions/transactions_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  setupServiceLocator();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(getIt())),
        ChangeNotifierProvider(create: (_) => UserProvider(getIt())),
        ChangeNotifierProvider(create: (_) => PaymentProvider(getIt(), getIt())),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) => MaterialApp.router(
          title: Config.appName,
          theme: AppTheme.buildTheme(),
          routerConfig: _buildRouter(authProvider),
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
  }

  GoRouter _buildRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/splash',
      refreshListenable: authProvider,
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const _SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/signup',
          builder: (context, state) => const SignupScreen(),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/payment',
          builder: (context, state) => const PaymentScreen(),
        ),
        GoRoute(
          path: '/payment-status/:id',
          builder: (context, state) =>
              PaymentStatusScreen(paymentId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/transactions',
          builder: (context, state) => const TransactionsScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
      ],
      redirect: (context, state) {
        final location = state.matchedLocation;
        final isAuthRoute = location == '/login' || location == '/signup';
        final isSplash = location == '/splash';

        if (!authProvider.isReady) {
          return isSplash ? null : '/splash';
        }

        if (isSplash) {
          return authProvider.isAuthenticated ? '/dashboard' : '/login';
        }

        if (!authProvider.isAuthenticated && !isAuthRoute) {
          return '/login';
        }

        if (authProvider.isAuthenticated && isAuthRoute) {
          return '/dashboard';
        }

        return null;
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
