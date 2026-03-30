import 'package:flutter/foundation.dart';

class Config {
  static const String appName = 'DhanPe';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String baseUrl = 'http://localhost:3000/api';
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
  static bool get enableLogging => true;
}
