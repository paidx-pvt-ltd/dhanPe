import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/msg91_widget_service.dart';
import '../../services/service_locator.dart';
import '../../widgets/legal_links.dart';
import '../../widgets/kinetic_primitives.dart';

class OtpVerifyScreen extends StatefulWidget {
  const OtpVerifyScreen({
    required this.mobileNumber,
    super.key,
  });

  final String mobileNumber;

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  final _otpController = TextEditingController();
  late final Msg91WidgetService _msg91WidgetService;

  bool _isVerifying = false;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    _msg91WidgetService = getIt<Msg91WidgetService>();
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _handleVerify() async {
    final otp = _otpController.text.trim();
    if (otp.length < 4) {
      _showSnackBar('Enter the OTP');
      return;
    }

    final authProvider = context.read<AuthProvider>();
    setState(() => _isVerifying = true);
    try {
      final accessToken = await _msg91WidgetService.verifyOtp(otp: otp);
      await authProvider.loginWithOtp(
        mobileNumber: widget.mobileNumber,
        accessToken: accessToken,
      );

      if (!mounted) return;
      if (authProvider.error != null && authProvider.error!.isNotEmpty) {
        _showSnackBar(authProvider.error!);
        return;
      }

      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _handleRetry() async {
    setState(() => _isRetrying = true);
    try {
      await _msg91WidgetService.retryOtp();
      if (!mounted) return;
      _showSnackBar('OTP resent');
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isRetrying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: SafeArea(
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
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Verify OTP',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Enter the OTP sent to ${widget.mobileNumber}.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyLarge
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 28),
                  KineticPanel(
                    glass: true,
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _otpController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'OTP',
                            prefixIcon: Icon(Icons.password_rounded),
                            hintText: 'Enter OTP',
                          ),
                        ),
                        const SizedBox(height: 18),
                        GradientButton(
                          label: 'Verify & Continue',
                          icon: Icons.verified_rounded,
                          isLoading: _isVerifying,
                          onPressed: _isVerifying ? null : _handleVerify,
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _isRetrying || _isVerifying ? null : _handleRetry,
                          icon: _isRetrying
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.refresh_rounded),
                          label: Text(_isRetrying ? 'Resending...' : 'Resend OTP'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  const LegalLinks(compact: true),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

