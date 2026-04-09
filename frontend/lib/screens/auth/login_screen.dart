import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/legal_links.dart';
import '../../widgets/kinetic_primitives.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobileController = TextEditingController();
  final _accessTokenController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().loadWidgetConfig();
    });
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _accessTokenController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final authProvider = context.read<AuthProvider>();
    await authProvider.loginWithOtp(
      mobileNumber: _mobileController.text.trim(),
      accessToken: _accessTokenController.text.trim(),
    );

    if (!mounted) {
      return;
    }

    if (authProvider.isAuthenticated) {
      await context.read<UserProvider>().loadProfile();
      if (!mounted) {
        return;
      }
      context.go('/home');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(authProvider.error ?? 'Authentication failed')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: Stack(
          children: [
            Positioned(
              top: -50,
              left: -40,
              child: Container(
                width: 180,
                height: 180,
                decoration: AppTheme.glowingOrb(AppColors.primary, opacity: 0.2),
              ),
            ),
            Positioned(
              bottom: 160,
              right: -40,
              child: Container(
                width: 170,
                height: 170,
                decoration: AppTheme.glowingOrb(AppColors.secondary, opacity: 0.14),
              ),
            ),
            SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                children: [
                  Row(
                    children: [
                      const Icon(Icons.spa_rounded, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Text('dhanpe', style: Theme.of(context).textTheme.headlineSmall),
                    ],
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'Verify your mobile. Continue with compliance-first access.',
                    style: Theme.of(context).textTheme.displayMedium,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Authenticate with the MSG91 widget, then submit the resulting access token to continue.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyLarge
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 28),
                  KineticPanel(
                    glass: true,
                    child: Form(
                      key: _formKey,
                      child: Consumer<AuthProvider>(
                        builder: (context, authProvider, _) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Mobile sign in',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                authProvider.widgetId == null
                                    ? 'Load the widget configuration, complete MSG91 verification, then paste the access token below.'
                                    : 'MSG91 widget ready: ${authProvider.widgetId}',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 18),
                              TextFormField(
                                controller: _mobileController,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                  labelText: 'Mobile number',
                                  prefixIcon: Icon(Icons.phone_iphone_rounded),
                                ),
                                validator: (value) {
                                  final normalized =
                                      value?.replaceAll(RegExp(r'[^0-9+]'), '') ?? '';
                                  if (normalized.length < 10) {
                                    return 'Enter a valid mobile number';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _accessTokenController,
                                minLines: 2,
                                maxLines: 4,
                                decoration: const InputDecoration(
                                  labelText: 'MSG91 access token',
                                  prefixIcon: Icon(Icons.key_rounded),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Access token is required';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 14),
                              OutlinedButton.icon(
                                onPressed: authProvider.isLoading
                                    ? null
                                    : () => authProvider.loadWidgetConfig(),
                                icon: const Icon(Icons.refresh_rounded),
                                label: const Text('Reload widget configuration'),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Frontend impact: embed or launch the MSG91 widget in your delivery surface, then pass its access token here for backend verification.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 20),
                              GradientButton(
                                label: 'Verify and continue',
                                icon: Icons.arrow_forward_rounded,
                                isLoading: authProvider.isLoading,
                                onPressed: authProvider.isLoading ? null : _handleLogin,
                              ),
                              const SizedBox(height: 12),
                              const LegalLinks(compact: true),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
