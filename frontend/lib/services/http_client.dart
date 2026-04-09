import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/config.dart';

class HttpClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage;
  String? _sessionAccessToken;

  HttpClient(this._storage) {
    if (!Config.debugMode && !Config.isSecureBackend) {
      throw StateError('Release builds must use an HTTPS backend URL.');
    }

    _dio = Dio(
      BaseOptions(
        baseUrl: Config.baseUrl,
        connectTimeout: Config.apiTimeout,
        receiveTimeout: Config.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onError: _onError,
      ),
    );
  }

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _readAccessToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    if (Config.enableLogging) {
      // Suppress request log for widget-config — 503 is expected when MSG91
      // isn't configured server-side; no need to clutter the console.
      final isWidgetConfig = options.path.contains('widget-config');
      if (!isWidgetConfig) {
        final safeHeaders = Map<String, dynamic>.from(options.headers);
        if (safeHeaders.containsKey('Authorization')) {
          safeHeaders['Authorization'] = 'Bearer [redacted]';
        }

        debugPrint('API ${options.method} ${options.path}');
        debugPrint('Base URL: ${options.baseUrl}');
        debugPrint('Headers: $safeHeaders');
      }
    }

    handler.next(options);
  }

  Future<String?> _readAccessToken() async {
    if (_sessionAccessToken != null && _sessionAccessToken!.isNotEmpty) {
      return _sessionAccessToken;
    }

    try {
      return _storage.read(key: Config.accessTokenKey);
    } catch (error) {
      if (Config.enableLogging) {
        debugPrint('Token read failed from secure storage: $error');
      }
      return null;
    }
  }

  Future<void> _onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && Config.enableLogging) {
      debugPrint('Token expired, attempting refresh...');
    }

    if (Config.enableLogging) {
      // Suppress noisy but expected 503 from /auth/widget-config — MSG91 is
      // not configured on the backend; the provider handles this gracefully.
      final isExpectedWidgetConfig503 =
          err.response?.statusCode == 503 &&
          (err.requestOptions.path.contains('widget-config'));

      if (!isExpectedWidgetConfig503) {
        debugPrint('Error type: ${err.type}');
        debugPrint('Error: ${err.message}');
        debugPrint('Response: ${err.response?.data}');
        if (kIsWeb && err.response == null) {
          debugPrint(
            'Web request failed before response. Check CORS, HTTPS certificate, and API base URL.',
          );
        }
      }
    }

    handler.next(err);
  }

  Dio getDio() => _dio;

  void setBaseURL(String url) {
    _dio.options.baseUrl = url;
  }

  Future<void> setAuthToken(String token) async {
    _sessionAccessToken = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuth() {
    _sessionAccessToken = null;
    _dio.options.headers.remove('Authorization');
  }
}
