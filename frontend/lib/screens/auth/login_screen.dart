import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../services/msg91_widget_service.dart';
import '../../services/service_locator.dart';
import '../../widgets/legal_links.dart';
import '../../widgets/kinetic_primitives.dart';
import '../../widgets/msg91_captcha_host.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  late final Msg91WidgetService _msg91WidgetService;
  bool _widgetInitialized = false;
  bool _otpSent = false;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  bool _isRetryingOtp = false;

  @override
  void initState() {
    super.initState();
    _msg91WidgetService = getIt<Msg91WidgetService>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().loadWidgetConfig();
    });
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _ensureWidgetReady(AuthProvider authProvider) async {
    if (_widgetInitialized) {
      return;
    }

    if (!kIsWeb) {
      throw Exception('MSG91 web verification is only supported on Flutter web.');
    }

    if (!authProvider.isWidgetConfigured) {
      throw Exception('MSG91 widget is not configured for this environment.');
    }

    await _msg91WidgetService.initialize(
      widgetId: authProvider.widgetId!,
      tokenAuth: authProvider.widgetTokenAuth!,
    );
    _widgetInitialized = true;
  }

  Future<void> _handleSendOtp() async {
    if (!_validateMobileNumber()) {
      return;
    }

    final authProvider = context.read<AuthProvider>();
    setState(() => _isSendingOtp = true);

    try {
      await _ensureWidgetReady(authProvider);
      await _msg91WidgetService.sendOtp(identifier: _normalizedWidgetMobileNumber());

      if (!mounted) {
        return;
      }

      setState(() => _otpSent = true);
      _showSnackBar('OTP sent to ${_mobileController.text.trim()}');
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isSendingOtp = false);
      }
    }
  }

  Future<void> _handleRetryOtp() async {
    final authProvider = context.read<AuthProvider>();
    setState(() => _isRetryingOtp = true);

    try {
      await _ensureWidgetReady(authProvider);
      await _msg91WidgetService.retryOtp();

      if (!mounted) {
        return;
      }

      _showSnackBar('OTP sent again.');
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isRetryingOtp = false);
      }
    }
  }

  Future<void> _handleLogin() async {
    if (!_validateMobileNumber() || !_validateOtp()) {
      return;
    }

    final authProvider = context.read<AuthProvider>();
    setState(() => _isVerifyingOtp = true);

    try {
      await _ensureWidgetReady(authProvider);
      final accessToken = await _msg91WidgetService.verifyOtp(
        otp: _otpController.text.trim(),
      );

      await authProvider.loginWithOtp(
        mobileNumber: _mobileController.text.trim(),
        accessToken: accessToken,
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

      _showSnackBar(authProvider.error ?? 'Authentication failed');
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isVerifyingOtp = false);
      }
    }
  }

  bool _validateMobileNumber() {
    final normalized = _mobileController.text.replaceAll(RegExp(r'[^0-9+]'), '');
    if (normalized.length >= 10) {
      return true;
    }

    _showSnackBar('Enter a valid mobile number');
    return false;
  }

  bool _validateOtp() {
    final otp = _otpController.text.trim();
    if (otp.length >= 4) {
      return true;
    }

    _showSnackBar('Enter the OTP you received');
    return false;
  }

  String _normalizedWidgetMobileNumber() {
    final digits = _mobileController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length <= 10) {
      return '91$digits';
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
                                authProvider.isWidgetConfigured
                                    ? 'MSG91 widget ready. Send an OTP, enter it below, and continue.'
                                    : 'MSG91 web verification is unavailable until the widget configuration is loaded.',
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
                              SizedBox(
                                height: 48,
                                child: OutlinedButton.icon(
                                  onPressed: authProvider.isLoading || _isSendingOtp
                                      ? null
                                      : _handleSendOtp,
                                  icon: _isSendingOtp
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : const Icon(Icons.sms_rounded),
                                  label: Text(_otpSent ? 'Send OTP again' : 'Send OTP'),
                                ),
                              ),
                              const SizedBox(height: 14),
                              if (kIsWeb) ...[
                                const Msg91CaptchaHost(),
                                const SizedBox(height: 14),
                              ],
                              TextFormField(
                                controller: _otpController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'OTP',
                                  prefixIcon: Icon(Icons.lock_clock_rounded),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().length < 4) {
                                    return 'Enter the OTP you received';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 14),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: authProvider.isLoading || _isRetryingOtp || !_otpSent
                                          ? null
                                          : _handleRetryOtp,
                                      icon: _isRetryingOtp
                                          ? const SizedBox(
                                              width: 18,
                                              height: 18,
                                              child: CircularProgressIndicator(strokeWidth: 2),
                                            )
                                          : const Icon(Icons.refresh_rounded),
                                      label: const Text('Resend OTP'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: authProvider.isLoading
                                          ? null
                                          : () => authProvider.loadWidgetConfig(),
                                      icon: const Icon(Icons.sync_rounded),
                                      label: const Text('Reload widget'),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                kIsWeb
                                    ? 'The widget handles OTP delivery in the browser. The backend still performs the final access-token verification before a session is issued.'
                                    : 'This build only supports MSG91 verification on Flutter web right now.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 20),
                              GradientButton(
                                label: 'Verify and continue',
                                icon: Icons.arrow_forward_rounded,
                                isLoading: authProvider.isLoading || _isVerifyingOtp,
                                onPressed: authProvider.isLoading || _isVerifyingOtp
                                    ? null
                                    : _handleLogin,
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
