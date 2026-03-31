import 'package:flutter/foundation.dart';

class Config {
  static const String appName = 'DhanPe';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String _localWebBaseUrl = 'http://localhost:3000/api';
  static const String _localAndroidEmulatorBaseUrl = 'http://10.0.2.2:3000/api';
  static const String _defaultProductionBaseUrl =
      'https://project-szw1p.vercel.app/api';
  static const String _baseUrlOverride = String.fromEnvironment(
    'DHANPE_API_BASE_URL',
    defaultValue: '',
  );

  static String get baseUrl {
    if (_baseUrlOverride.isNotEmpty) {
      return _baseUrlOverride;
    }

    if (kDebugMode) {
      if (kIsWeb) {
        return _localWebBaseUrl;
      }

      if (defaultTargetPlatform == TargetPlatform.android) {
        return _localAndroidEmulatorBaseUrl;
      }
    }

    return _defaultProductionBaseUrl;
  }

  static const Duration apiTimeout = Duration(seconds: 30);

  // Payment Configuration
  static const String cashfreeClientId = 'YOUR_CASHFREE_CLIENT_ID';
  static const String cashfreeAppId = 'YOUR_CASHFREE_APP_ID';
  static const bool isCashfreeSandbox = true;

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user';

  // Certificate Pinning
  static const List<String> certificatePins = [
    'sha256/YOUR_CERTIFICATE_PIN_HERE',
  ];

  // Logging
  static bool get debugMode => kDebugMode;
  static bool get enableLogging => kDebugMode;
  static bool get isSecureBackend => baseUrl.startsWith('https://');
}
