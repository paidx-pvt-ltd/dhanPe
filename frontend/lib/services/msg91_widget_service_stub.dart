import 'package:flutter/foundation.dart';
import 'package:sendotp_flutter_sdk/sendotp_flutter_sdk.dart';
import '../core/exceptions.dart';
import 'msg91_widget_service_base.dart';

class NativeMsg91WidgetService implements Msg91WidgetService {
  bool _initialized = false;
  String? _lastReqId;

  @override
  Future<void> initialize({
    required String widgetId,
    required String tokenAuth,
  }) async {
    try {
      // The SDK's initializeWidget returns void synchronously.
      OTPWidget.initializeWidget(widgetId, tokenAuth);
      debugPrint('[MSG91] Native SDK initialized with WidgetId: $widgetId');
      _initialized = true;
    } catch (e) {
      throw AuthException('Failed to initialize native MSG91 SDK: $e');
    }
  }

  @override
  Future<void> sendOtp({required String identifier}) async {
    _assertInitialized();
    try {
      final response = await OTPWidget.sendOTP({'identifier': identifier});
      debugPrint('[MSG91] sendOTP response: $response');
      if (response != null) {
        if (response['type'] == 'error') {
          throw AuthException(response['message'] ?? 'Failed to send OTP via native SDK');
        }
        // Fallback to 'message' if 'reqId' is missing, as some SDK versions return the ID in 'message'
        _lastReqId = response['reqId']?.toString() ?? response['message']?.toString();
        debugPrint('[MSG91] sendOTP success, reqId: $_lastReqId');
      }
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException('Native sendOtp failed: $e');
    }
  }

  @override
  Future<void> retryOtp() async {
    _assertInitialized();
    if (_lastReqId == null) {
      throw AuthException('Cannot retry OTP: No previous request ID found.');
    }
    
    try {
      final response = await OTPWidget.retryOTP({'reqId': _lastReqId!});
      if (response != null && response['type'] == 'error') {
        throw AuthException(response['message'] ?? 'Failed to resend OTP via native SDK');
      }
    } catch (e) {
      throw AuthException('Native retryOtp failed: $e');
    }
  }

  @override
  Future<String> verifyOtp({required String otp}) async {
    _assertInitialized();
    if (_lastReqId == null) {
      throw AuthException('Cannot verify OTP: No previous request ID found. Please try sending the OTP again.');
    }

    try {
      final response = await OTPWidget.verifyOTP({
        'otp': otp,
        'reqId': _lastReqId,
      });
      debugPrint('[MSG91] verifyOTP response: $response');
      
      if (response != null && response['type'] == 'success') {
        final token = response['token']?.toString() ?? 
                      response['accessToken']?.toString() ?? 
                      response['message']?.toString();
        if (token != null) {
          return token;
        }
        throw AuthException('OTP verified but no access token was returned by the native SDK.');
      }
      
      throw AuthException(response?['message'] ?? 'OTP verification failed');
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException('Native verifyOtp failed: $e');
    }
  }

  void _assertInitialized() {
    if (!_initialized) {
      throw AuthException('Native MSG91 SDK is not initialized.');
    }
  }
}

Msg91WidgetService createMsg91WidgetService() => NativeMsg91WidgetService();
