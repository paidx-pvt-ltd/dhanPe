import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'config/config.dart';
import 'core/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/beneficiary_provider.dart';
import 'providers/payment_provider.dart';
import 'providers/transactions_provider.dart';
import 'providers/user_provider.dart';
import 'screens/accounts/accounts_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/payment/payment_screen.dart';
import 'screens/payment/payment_status_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/transactions/transactions_screen.dart';
import 'services/service_locator.dart';
import 'widgets/app_shell.dart';

void main() {
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
        ChangeNotifierProvider(create: (_) => BeneficiaryProvider(getIt())),
        ChangeNotifierProvider(create: (_) => TransactionsProvider(getIt())),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp.router(
            title: Config.appName,
            theme: AppTheme.buildTheme(),
            debugShowCheckedModeBanner: false,
            routerConfig: _router(authProvider),
          );
        },
      ),
    );
  }

  GoRouter _router(AuthProvider authProvider) {
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
        ShellRoute(
          builder: (context, state, child) => AppShell(
            location: state.uri.path,
            child: child,
          ),
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const DashboardScreen(),
            ),
            GoRoute(
              path: '/accounts',
              builder: (context, state) => const AccountsScreen(),
            ),
            GoRoute(
              path: '/payments',
              builder: (context, state) => const PaymentScreen(),
            ),
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
            GoRoute(
              path: '/transfers',
              builder: (context, state) => const TransactionsScreen(),
            ),
            GoRoute(
              path: '/transfers/:id',
              builder: (context, state) =>
                  PaymentStatusScreen(paymentId: state.pathParameters['id']!),
            ),
          ],
        ),
      ],
      redirect: (context, state) {
        final location = state.matchedLocation;
        final authRoutes = {'/login', '/signup'};
        final isAuthRoute = authRoutes.contains(location);
        final isSplash = location == '/splash';

        if (!authProvider.isReady) {
          return isSplash ? null : '/splash';
        }

        if (isSplash) {
          return authProvider.isAuthenticated ? '/home' : '/login';
        }

        if (!authProvider.isAuthenticated && !isAuthRoute) {
          return '/login';
        }

        if (authProvider.isAuthenticated && isAuthRoute) {
          return '/home';
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
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  gradient: AppGradients.kinetic,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.spa_rounded, color: Colors.white, size: 38),
              ),
              const SizedBox(height: 18),
              Text('dhanpe', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 8),
              Text(
                'Routing your workspace',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
