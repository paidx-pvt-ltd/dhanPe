import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/app_theme.dart';
import '../../models/onboarding_status.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class WidgetVerifyScreen extends StatefulWidget {
  const WidgetVerifyScreen({
    required this.mobileNumber,
    required this.widgetConfig,
    super.key,
  });

  final String mobileNumber;
  final Msg91WidgetConfig widgetConfig;

  @override
  State<WidgetVerifyScreen> createState() => _WidgetVerifyScreenState();
}

class _WidgetVerifyScreenState extends State<WidgetVerifyScreen> {
  WebViewController? _controller;
  bool _isVerifying = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb &&
        widget.widgetConfig.widgetEnabled &&
        widget.widgetConfig.widgetId != null &&
        widget.widgetConfig.widgetToken != null) {
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..addJavaScriptChannel(
          'DhanPeAuth',
          onMessageReceived: (message) => _handleWidgetMessage(message.message),
        )
        ..loadHtmlString(_buildWidgetHtml(
          widget.widgetConfig.widgetId!,
          widget.widgetConfig.widgetToken!,
        ));
    }
  }

  String _buildWidgetHtml(String widgetId, String widgetToken) {
    final escapedWidgetId = jsonEncode(widgetId);
    final escapedToken = jsonEncode(widgetToken);

    return '''
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: sans-serif; padding: 16px;">
    <p>Complete OTP verification using MSG91.</p>
    <script src="https://verify.msg91.com/otp-provider.js"></script>
    <script>
      const configuration = {
        widgetId: $escapedWidgetId,
        tokenAuth: $escapedToken,
        identifier: ${jsonEncode(widget.mobileNumber.replaceAll('+', ''))},
        exposeMethods: true,
        success: (data) => {
          DhanPeAuth.postMessage(JSON.stringify({ type: 'success', token: data }));
        },
        failure: (error) => {
          DhanPeAuth.postMessage(JSON.stringify({ type: 'failure', message: String(error) }));
        }
      };
      window.onload = function () {
        if (typeof initSendOTP === 'function') {
          initSendOTP(configuration);
        } else {
          DhanPeAuth.postMessage(JSON.stringify({ type: 'failure', message: 'MSG91 widget failed to load' }));
        }
      };
    </script>
  </body>
</html>
''';
  }

  Future<void> _handleWidgetMessage(String rawMessage) async {
    try {
      final payload = jsonDecode(rawMessage) as Map<String, dynamic>;
      final type = payload['type']?.toString();

      if (type == 'failure') {
        setState(() {
          _statusMessage = payload['message']?.toString() ?? 'Widget verification failed';
        });
        return;
      }

      if (type != 'success') {
        return;
      }

      final token = payload['token']?.toString();
      if (token == null || token.isEmpty) {
        setState(() => _statusMessage = 'MSG91 did not return an access token');
        return;
      }

      await _verifyAccessToken(token);
    } catch (_) {
      setState(() => _statusMessage = 'Could not parse MSG91 widget response');
    }
  }

  Future<void> _verifyAccessToken(String accessToken) async {
    setState(() {
      _isVerifying = true;
      _statusMessage = null;
    });

    final authProvider = context.read<AuthProvider>();
    final verified = await authProvider.verifyWidget(
      mobileNumber: widget.mobileNumber,
      accessToken: accessToken,
    );

    if (!mounted) return;
    setState(() => _isVerifying = false);

    if (verified) {
      context.go('/home');
      return;
    }

    setState(() {
      _statusMessage = authProvider.error ?? 'Verification failed';
    });
  }

  Future<void> _verifySandboxToken() async {
    final digits = widget.mobileNumber.replaceAll(RegExp(r'[^0-9]'), '');
    await _verifyAccessToken('sandbox-widget-$digits');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 24, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                    Expanded(
                      child: Text(
                        'Verify mobile',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                  ],
                ),
              ),
              if (_statusMessage != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  child: Text(
                    _statusMessage!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.warning,
                    ),
                  ),
                ),
              Expanded(
                child: _controller == null
                    ? Padding(
                        padding: const EdgeInsets.all(24),
                        child: KineticPanel(
                          glass: true,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text(
                                'MSG91 widget is not available on this platform. Use SMS OTP verification instead.',
                              ),
                              const SizedBox(height: 16),
                              GradientButton(
                                label: 'Continue with SMS OTP',
                                icon: Icons.sms_rounded,
                                onPressed: () => context.push(
                                  '/login/otp',
                                  extra: widget.mobileNumber,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : WebViewWidget(controller: _controller!),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (widget.widgetConfig.sandboxEnabled)
                      OutlinedButton(
                        onPressed: _isVerifying ? null : _verifySandboxToken,
                        child: const Text('Verify sandbox token'),
                      ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _isVerifying
                          ? null
                          : () => context.push('/login/otp', extra: widget.mobileNumber),
                      child: const Text('Use SMS OTP instead'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
