import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/legal_links.dart';
import '../../widgets/kinetic_primitives.dart';
import '../../widgets/msg91_captcha_host.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _mobileController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isSendingOtp = false;

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
    super.dispose();
  }

  Future<void> _handleLaunchWidget() async {
    if (!_validateMobileNumber()) return;

    final authProvider = context.read<AuthProvider>();
    setState(() => _isSendingOtp = true);

    try {
      await authProvider.requestOtp(mobileNumber: _normalizedWidgetMobileNumber());

      if (!mounted) return;
      if (authProvider.error != null && authProvider.error!.isNotEmpty) {
        _showSnackBar(authProvider.error!);
        return;
      }
      // Native SDK sends the OTP but does not automatically present UI.
      // We route to our OTP screen to complete verification.
      context.push('/login/otp', extra: _normalizedWidgetMobileNumber());
    } catch (error) {
      if (!mounted) return;
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isSendingOtp = false);
    }
  }

  bool _validateMobileNumber() {
    final normalized = _mobileController.text.replaceAll(RegExp(r'[^0-9+]'), '');
    if (normalized.length >= 10) return true;
    _showSnackBar('Enter a valid mobile number');
    return false;
  }

  String _normalizedWidgetMobileNumber() {
    final digits = _mobileController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length == 10) {
      return '+91$digits';
    }
    return digits;
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: Stack(
          children: [
            // Ambient orbs
            Positioned(
              top: -60,
              left: -50,
              child: Container(
                width: 220,
                height: 220,
                decoration: AppTheme.glowingOrb(AppColors.primary, opacity: 0.18),
              ),
            ),
            Positioned(
              bottom: 120,
              right: -60,
              child: Container(
                width: 200,
                height: 200,
                decoration: AppTheme.glowingOrb(AppColors.secondary, opacity: 0.13),
              ),
            ),
            const Positioned(
              top: 0,
              left: 0,
              child: Msg91CaptchaHost(),
            ),
            // Main content
            SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: isWide ? 480 : double.infinity),
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(
                      isWide ? 0 : 24,
                      28,
                      isWide ? 0 : 24,
                      40,
                    ),
                    children: [
                      // Logo
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              gradient: AppGradients.kinetic,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              'dp',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'dhanpe',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      // Hero heading
                      Text(
                        'Sign in with\nyour mobile.',
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'We will use a secure SMS widget to verify your number.',
                        style: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 32),
                      // Form card
                      KineticPanel(
                        glass: true,
                        padding: const EdgeInsets.all(24),
                        child: Form(
                          key: _formKey,
                          child: Consumer<AuthProvider>(
                            builder: (context, authProvider, _) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Mobile field
                                  TextFormField(
                                    controller: _mobileController,
                                    keyboardType: TextInputType.phone,
                                    decoration: const InputDecoration(
                                      labelText: 'Mobile number',
                                      prefixIcon: Icon(Icons.phone_iphone_rounded),
                                      hintText: '98XXXXXXXX',
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
                                  const SizedBox(height: 24),
                                  // Launch Widget Button
                                  GradientButton(
                                    label: 'Verify Mobile Number',
                                    icon: Icons.security_rounded,
                                    isLoading: _isSendingOtp || authProvider.isLoading,
                                    onPressed: authProvider.isWidgetConfigured
                                        ? _handleLaunchWidget
                                        : null,
                                  ),
                                  if (!authProvider.isWidgetConfigured) ...[
                                    const SizedBox(height: 12),
                                    Text(
                                      'OTP verification is temporarily unavailable.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: AppColors.warning),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      const LegalLinks(compact: true),
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

