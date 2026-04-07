import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/config.dart';

class HttpClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage;

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
      final safeHeaders = Map<String, dynamic>.from(options.headers);
      if (safeHeaders.containsKey('Authorization')) {
        safeHeaders['Authorization'] = 'Bearer [redacted]';
      }

      debugPrint('API ${options.method} ${options.path}');
      debugPrint('Headers: $safeHeaders');
    }

    handler.next(options);
  }

  Future<String?> _readAccessToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(Config.accessTokenKey);
    }

    return _storage.read(key: Config.accessTokenKey);
  }

  Future<void> _onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && Config.enableLogging) {
      debugPrint('Token expired, attempting refresh...');
    }

    if (Config.enableLogging) {
      debugPrint('Error: ${err.message}');
      debugPrint('Response: ${err.response?.data}');
    }

    handler.next(err);
  }

  Dio getDio() => _dio;

  void setBaseURL(String url) {
    _dio.options.baseUrl = url;
  }

  Future<void> setAuthToken(String token) async {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuth() {
    _dio.options.headers.remove('Authorization');
  }
}
