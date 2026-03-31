import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'config/config.dart';
import 'services/service_locator.dart';
import 'providers/auth_provider.dart';
import 'providers/user_provider.dart';
import 'providers/payment_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/payment/payment_screen.dart';
import 'screens/payment/payment_status_screen.dart';
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
        ChangeNotifierProvider(
          create: (_) => AuthProvider(getIt()),
        ),
        ChangeNotifierProvider(
          create: (_) => UserProvider(getIt()),
        ),
        ChangeNotifierProvider(
          create: (_) => PaymentProvider(getIt()),
        ),
      ],
      child: MaterialApp.router(
        title: Config.appName,
        theme: _buildTheme(),
        routerConfig: _buildRouter(context),
        debugShowCheckedModeBanner: false,
      ),
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF2196F3),
        brightness: Brightness.light,
      ),
      fontFamily: 'Poppins',
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF5F5F5),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        labelStyle: const TextStyle(color: Color(0x000ff666)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }

  GoRouter _buildRouter(BuildContext context) {
    return GoRouter(
      initialLocation: '/login',
      routes: [
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
          builder: (context, state) => PaymentStatusScreen(
            paymentId: state.pathParameters['id']!,
          ),
        ),
        GoRoute(
          path: '/transactions',
          builder: (context, state) => const TransactionsScreen(),
        ),
      ],
      redirect: (context, state) {
        final authProvider = context.read<AuthProvider>();

        // If not authenticated, redirect to login
        if (!authProvider.isAuthenticated && state.matchedLocation != '/login' && state.matchedLocation != '/signup') {
          return '/login';
        }

        // If authenticated and trying to access auth pages, redirect to dashboard
        if (authProvider.isAuthenticated && (state.matchedLocation == '/login' || state.matchedLocation == '/signup')) {
          return '/dashboard';
        }

        return null;
      },
    );
  }
}

extension on BuildContext {
  T get<T>() => read<T>();
}
