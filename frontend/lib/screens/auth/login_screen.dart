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

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  late final Msg91WidgetService _msg91WidgetService;
  late final AnimationController _otpRevealController;
  late final Animation<double> _otpRevealAnimation;

  bool _widgetInitialized = false;
  bool _otpSent = false;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  bool _isRetryingOtp = false;

  /// 0 = Enter number, 1 = Receive OTP, 2 = Verify
  int get _currentStep => _otpSent ? (_isVerifyingOtp ? 2 : 1) : 0;

  static const _steps = ['Enter number', 'Receive OTP', 'Verify'];

  @override
  void initState() {
    super.initState();
    _msg91WidgetService = getIt<Msg91WidgetService>();
    _otpRevealController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 340),
    );
    _otpRevealAnimation = CurvedAnimation(
      parent: _otpRevealController,
      curve: Curves.easeOutCubic,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().loadWidgetConfig();
    });
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    _otpRevealController.dispose();
    super.dispose();
  }

  Future<void> _ensureWidgetReady(AuthProvider authProvider) async {
    if (_widgetInitialized) return;

    if (!kIsWeb) {
      throw Exception('OTP sign-in is only available in the web app right now.');
    }

    if (!authProvider.isWidgetConfigured) {
      throw Exception('OTP service is temporarily unavailable. Please try again later.');
    }

    await _msg91WidgetService.initialize(
      widgetId: authProvider.widgetId!,
      tokenAuth: authProvider.widgetTokenAuth!,
    );
    _widgetInitialized = true;
  }

  Future<void> _handleSendOtp() async {
    if (!_validateMobileNumber()) return;

    final authProvider = context.read<AuthProvider>();
    setState(() => _isSendingOtp = true);

    try {
      await _ensureWidgetReady(authProvider);
      await _msg91WidgetService.sendOtp(identifier: _normalizedWidgetMobileNumber());

      if (!mounted) return;

      setState(() => _otpSent = true);
      _otpRevealController.forward();
      _showSnackBar('OTP sent to ${_mobileController.text.trim()}');
    } catch (error) {
      if (!mounted) return;
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isSendingOtp = false);
    }
  }

  Future<void> _handleRetryOtp() async {
    final authProvider = context.read<AuthProvider>();
    setState(() => _isRetryingOtp = true);

    try {
      await _ensureWidgetReady(authProvider);
      await _msg91WidgetService.retryOtp();
      if (!mounted) return;
      _showSnackBar('OTP resent.');
    } catch (error) {
      if (!mounted) return;
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isRetryingOtp = false);
    }
  }

  Future<void> _handleLogin() async {
    if (!_validateMobileNumber() || !_validateOtp()) return;

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

      if (!mounted) return;

      if (authProvider.isAuthenticated) {
        await context.read<UserProvider>().loadProfile();
        if (!mounted) return;
        context.go('/home');
        return;
      }

      _showSnackBar(authProvider.error ?? 'Authentication failed');
    } catch (error) {
      if (!mounted) return;
      _showSnackBar(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isVerifyingOtp = false);
    }
  }

  bool _validateMobileNumber() {
    final normalized = _mobileController.text.replaceAll(RegExp(r'[^0-9+]'), '');
    if (normalized.length >= 10) return true;
    _showSnackBar('Enter a valid mobile number');
    return false;
  }

  bool _validateOtp() {
    final otp = _otpController.text.trim();
    if (otp.length >= 4) return true;
    _showSnackBar('Enter the OTP you received');
    return false;
  }

  String _normalizedWidgetMobileNumber() {
    final digits = _mobileController.text.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length <= 10 ? '91$digits' : digits;
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
            // MSG91 captcha widget — 1×1px off-screen; must exist in tree for JS bridge
            if (kIsWeb)
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
                        'Verify your number via OTP to access your account securely.',
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
                                  // Step indicator
                                  StepIndicator(
                                    steps: _steps,
                                    currentStep: _currentStep,
                                  ),
                                  const SizedBox(height: 20),
                                  // Mobile field
                                  TextFormField(
                                    controller: _mobileController,
                                    keyboardType: TextInputType.phone,
                                    enabled: !_otpSent,
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
                                  const SizedBox(height: 14),
                                  // Send OTP / Change number toggle
                                  AnimatedSwitcher(
                                    duration: const Duration(milliseconds: 220),
                                    child: _otpSent
                                        ? OutlinedButton.icon(
                                            key: const ValueKey('change-number'),
                                            onPressed: authProvider.isLoading
                                                ? null
                                                : () {
                                                    setState(() {
                                                      _otpSent = false;
                                                      _otpController.clear();
                                                    });
                                                    _otpRevealController.reverse();
                                                  },
                                            icon: const Icon(Icons.edit_rounded, size: 16),
                                            label: const Text('Change number'),
                                          )
                                        : Column(
                                            key: const ValueKey('send-otp'),
                                            crossAxisAlignment: CrossAxisAlignment.stretch,
                                            children: [
                                              SizedBox(
                                                height: 52,
                                                child: OutlinedButton.icon(
                                                  onPressed: authProvider.isLoading ||
                                                          _isSendingOtp ||
                                                          !authProvider.isWidgetConfigured
                                                      ? null
                                                      : _handleSendOtp,
                                                  icon: _isSendingOtp
                                                      ? const SizedBox(
                                                          width: 16,
                                                          height: 16,
                                                          child: CircularProgressIndicator(
                                                              strokeWidth: 2),
                                                        )
                                                      : const Icon(Icons.sms_rounded),
                                                  label: const Text('Send OTP'),
                                                ),
                                              ),
                                              if (!authProvider.isWidgetConfigured) ...[
                                                const SizedBox(height: 8),
                                                Text(
                                                  'OTP service is not available in this environment.',
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodySmall
                                                      ?.copyWith(
                                                        color: AppColors.textMuted
                                                            .withValues(alpha: 0.6),
                                                        fontSize: 11,
                                                      ),
                                                  textAlign: TextAlign.center,
                                                ),
                                              ],
                                            ],
                                          ),
                                  ),
                                  // OTP section — revealed after OTP is sent
                                  SizeTransition(
                                    sizeFactor: _otpRevealAnimation,
                                    axisAlignment: -1,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        const SizedBox(height: 20),
                                        TextFormField(
                                          controller: _otpController,
                                          keyboardType: TextInputType.number,
                                          decoration: const InputDecoration(
                                            labelText: 'OTP',
                                            prefixIcon: Icon(Icons.lock_clock_rounded),
                                            hintText: '• • • • • •',
                                          ),
                                          validator: (value) {
                                            if (value == null || value.trim().length < 4) {
                                              return 'Enter the OTP you received';
                                            }
                                            return null;
                                          },
                                        ),
                                        const SizedBox(height: 10),
                                        // Resend — subtle text button, not outlined
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton.icon(
                                            onPressed:
                                                authProvider.isLoading || _isRetryingOtp
                                                    ? null
                                                    : _handleRetryOtp,
                                            icon: _isRetryingOtp
                                                ? const SizedBox(
                                                    width: 14,
                                                    height: 14,
                                                    child: CircularProgressIndicator(
                                                        strokeWidth: 1.5),
                                                  )
                                                : const Icon(Icons.refresh_rounded, size: 15),
                                            label: const Text('Resend OTP'),
                                            style: TextButton.styleFrom(
                                              foregroundColor: AppColors.textMuted,
                                              textStyle: const TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                              ),
                                              padding: const EdgeInsets.symmetric(
                                                  horizontal: 8, vertical: 4),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        // Primary CTA
                                        GradientButton(
                                          label: 'Verify and continue',
                                          icon: Icons.arrow_forward_rounded,
                                          isLoading:
                                              authProvider.isLoading || _isVerifyingOtp,
                                          onPressed:
                                              authProvider.isLoading || _isVerifyingOtp
                                                  ? null
                                                  : _handleLogin,
                                        ),
                                      ],
                                    ),
                                  ),
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

