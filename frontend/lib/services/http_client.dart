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
      InterceptorsWrapper(onRequest: _onRequest, onError: _onError),
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
      debugPrint('Base URL: ${options.baseUrl}');
      debugPrint('Headers: $safeHeaders');
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
    final isRefreshRequest = err.requestOptions.path.contains('/auth/refresh');
    if (err.response?.statusCode == 401 && !isRefreshRequest) {
      if (Config.enableLogging) {
        debugPrint(
          'Token 401 detected for ${err.requestOptions.path}, attempting refresh...',
        );
      }

      try {
        final refreshToken = await _storage.read(key: Config.refreshTokenKey);

        if (refreshToken != null) {
          // Use a clean Dio instance to avoid interceptor recursion. Mirror timeouts
          // and JSON headers so the refresh request behaves consistently.
          final refreshDio = Dio(
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

          final response = await refreshDio.post(
            '/auth/refresh',
            data: {'refreshToken': refreshToken},
          );

          if (response.statusCode == 200) {
            final newAccessToken = response.data['accessToken'];
            final newRefreshToken = response.data['refreshToken'];

            if (newAccessToken != null) {
              await setAuthToken(newAccessToken);
              if (newRefreshToken != null) {
                await _storage.write(
                  key: Config.refreshTokenKey,
                  value: newRefreshToken,
                );
              }

              // Retry original request
              final opts = err.requestOptions;
              opts.headers['Authorization'] = 'Bearer $newAccessToken';

              final clonedResponse = await _dio.fetch(opts);
              return handler.resolve(clonedResponse);
            }
          }
        }
      } catch (refreshError) {
        if (Config.enableLogging) {
          debugPrint('Silent token refresh failed: $refreshError');
          if (refreshError is DioException) {
            debugPrint('Refresh response: ${refreshError.response?.data}');
          }
        }

        // Decide whether to clear auth based on the nature of the refresh failure.
        // - If the server returned 400/401 (invalid/expired refresh token), clear stored tokens.
        // - If this was a network or transient error, keep tokens and forward the original error
        //   so the UI can show an offline/temporary failure instead of forcing logout.
        var shouldClear = false;
        if (refreshError is DioException) {
          final status = refreshError.response?.statusCode;
          if (status == 400 || status == 401) {
            shouldClear = true;
          }
        }

        if (shouldClear) {
          clearAuth();
          await _storage.delete(key: Config.accessTokenKey);
          await _storage.delete(key: Config.refreshTokenKey);
        } else {
          // Transient/network error — don't remove tokens. Let the original handler continue.
          handler.next(err);
          return;
        }
      }
    }

    if (Config.enableLogging) {
      debugPrint('Error type: ${err.type}');
      debugPrint('Error: ${err.message}');
      debugPrint('Response: ${err.response?.data}');
      if (kIsWeb && err.response == null) {
        debugPrint(
          'Web request failed before response. Check CORS, HTTPS certificate, and API base URL.',
        );
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
