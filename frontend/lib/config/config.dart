import 'package:flutter/foundation.dart';

class Config {
  static const String appName = 'DhanPe';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String _defaultLocalBaseUrl = 'http://127.0.0.1:3000/api';
  static const String _defaultAndroidEmulatorBaseUrl =
      'http://10.0.2.2:3000/api';
  // Production backend (canonical): do not change unless you have a new production host.
  // This should point to the live API used by the mobile app in production/testing.
  static const String _defaultProductionBaseUrl =
      'https://dhanpe-production.up.railway.app';
  static const String _baseUrlOverride = String.fromEnvironment(
    'DHANPE_API_BASE_URL',
    defaultValue: '',
  );
  static const String _apiEnvironment = String.fromEnvironment(
    'DHANPE_API_ENV',
    defaultValue: 'production',
  );
  static const String _localBaseUrl = String.fromEnvironment(
    'DHANPE_LOCAL_API_BASE_URL',
    defaultValue: _defaultLocalBaseUrl,
  );
  static const String _androidEmulatorBaseUrl = String.fromEnvironment(
    'DHANPE_ANDROID_EMULATOR_API_BASE_URL',
    defaultValue: _defaultAndroidEmulatorBaseUrl,
  );
  static const String _productionBaseUrl = String.fromEnvironment(
    'DHANPE_PRODUCTION_API_BASE_URL',
    defaultValue: _defaultProductionBaseUrl,
  );

  static String get baseUrl {
    if (_baseUrlOverride.isNotEmpty) {
      return _normalizeApiBaseUrl(_baseUrlOverride);
    }

    switch (_apiEnvironment.toLowerCase()) {
      case 'local':
        return _normalizeApiBaseUrl(_localBaseUrl);
      case 'emulator':
      case 'android-emulator':
        return _normalizeApiBaseUrl(_androidEmulatorBaseUrl);
      case 'production':
      case 'prod':
        return _normalizeApiBaseUrl(_productionBaseUrl);
      case 'auto':
      default:
        return _normalizeApiBaseUrl(_resolveAutoBaseUrl());
    }
  }

  static String _resolveAutoBaseUrl() {
    if (!kDebugMode) {
      return _productionBaseUrl;
    }

    if (kIsWeb) {
      return _productionBaseUrl;
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return _androidEmulatorBaseUrl;
    }

    return _productionBaseUrl;
  }

  static String _normalizeApiBaseUrl(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return trimmed;
    }

    final withoutTrailingSlash = trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;

    final parsed = Uri.tryParse(withoutTrailingSlash);
    if (parsed == null) {
      return withoutTrailingSlash;
    }

    final path = parsed.path;
    if (path.isEmpty || path == '/') {
      return '$withoutTrailingSlash/api';
    }

    if (path.endsWith('/api')) {
      return withoutTrailingSlash;
    }

    return withoutTrailingSlash;
  }

  static const Duration apiTimeout = Duration(seconds: 30);

  // Payment Configuration
  static const String cashfreeClientId = 'YOUR_CASHFREE_CLIENT_ID';
  static const String cashfreeAppId = 'YOUR_CASHFREE_APP_ID';
  static const String _cashfreeEnvironment = String.fromEnvironment(
    'DHANPE_CASHFREE_ENV',
    defaultValue: 'sandbox',
  );
  static bool get isCashfreeSandbox =>
      _cashfreeEnvironment.toLowerCase() != 'production';

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
  static String get apiEnvironment => _apiEnvironment;
  static String get cashfreeEnvironment => _cashfreeEnvironment;
}
