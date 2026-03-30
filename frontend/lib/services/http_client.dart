import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/config.dart';

class HttpClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage;

  HttpClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: Config.baseUrl,
      connectTimeout: Config.apiTimeout,
      receiveTimeout: Config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
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
    final token = await _storage.read(key: Config.accessTokenKey);

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    if (Config.enableLogging) {
      print('📤 ${options.method} ${options.path}');
      print('Headers: ${options.headers}');
    }

    return handler.next(options);
  }

  Future<void> _onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 - token might be expired
    if (err.response?.statusCode == 401) {
      if (Config.enableLogging) {
        print('🔄 Token expired, attempting refresh...');
      }
      // Token refresh logic would go here
      // For now, just continue with the error
    }

    if (Config.enableLogging) {
      print('❌ Error: ${err.message}');
      print('Response: ${err.response?.data}');
    }

    return handler.next(err);
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
