import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/config.dart';
import '../core/exceptions.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthService(this._dio, this._storage);

  /// Sign up new user
  Future<Map<String, dynamic>> signup({
    required String identifier,
    required String secret,
    String? firstName,
    String? lastName,
    String? contactNumber,
  }) async {
    try {
      _ensureSensitiveTransport();
      final response = await _dio.post(
        '/auth/signup',
        data: {
          'email': identifier,
          'password': secret,
          'firstName': firstName,
          'lastName': lastName,
          'phoneNumber': contactNumber,
        },
      );

      if (response.statusCode == 201) {
        await _storeTokens(
          response.data['accessToken'],
          response.data['refreshToken'],
        );
        return response.data;
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: response.data['message'] ?? 'Signup failed',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Login user
  Future<Map<String, dynamic>> login({
    required String identifier,
    required String secret,
  }) async {
    try {
      _ensureSensitiveTransport();
      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': identifier,
          'password': secret,
        },
      );

      if (response.statusCode == 200) {
        await _storeTokens(
          response.data['accessToken'],
          response.data['refreshToken'],
        );
        return response.data;
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: response.data['message'] ?? 'Login failed',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Refresh access token
  Future<Map<String, dynamic>> refreshToken() async {
    try {
      _ensureSensitiveTransport();
      final refreshToken = await _storage.read(
        key: Config.refreshTokenKey,
      );

      if (refreshToken == null) {
        throw AuthException('No refresh token found');
      }

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        await _storeTokens(
          response.data['accessToken'],
          response.data['refreshToken'],
        );
        return response.data;
      }
      throw AuthException('Failed to refresh token');
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Logout user
  Future<void> logout() async {
    await _clearTokens();
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    return _storage.read(key: Config.accessTokenKey);
  }

  /// Get stored refresh token
  Future<String?> getRefreshToken() async {
    return _storage.read(key: Config.refreshTokenKey);
  }

  Future<void> clearSession() {
    return _clearTokens();
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null;
  }

  /// Store tokens securely
  Future<void> _storeTokens(String accessToken, String refreshToken) async {
    await Future.wait([
      _storage.write(key: Config.accessTokenKey, value: accessToken),
      _storage.write(key: Config.refreshTokenKey, value: refreshToken),
    ]);
  }

  /// Clear stored tokens
  Future<void> _clearTokens() async {
    await Future.wait([
      _storage.delete(key: Config.accessTokenKey),
      _storage.delete(key: Config.refreshTokenKey),
    ]);
  }

  void _ensureSensitiveTransport() {
    final target = Uri.tryParse(_dio.options.baseUrl);
    if (target == null) {
      throw AuthException('Invalid backend URL configuration');
    }

    final isLoopback = target.host == '127.0.0.1' ||
        target.host == 'localhost' ||
        target.host == '10.0.2.2';
    if (target.scheme != 'https' && !isLoopback) {
      throw AuthException('Insecure backend URL blocked for auth operation');
    }
  }

  /// Handle DioException
  void _handleDioException(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      throw ApiError(
        type: ApiException.timeoutError,
        message: 'Request timeout',
      );
    } else if (e.response?.statusCode == 401) {
      throw AuthException('Unauthorized. Please login again.');
    } else if (e.response?.statusCode == 400) {
      throw ApiError(
        type: ApiException.validationError,
        message: e.response?.data['message'] ?? 'Validation error',
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message: e.message ?? 'Network error',
      );
    }
  }
}
