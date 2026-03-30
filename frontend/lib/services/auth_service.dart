import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/config.dart';
import '../core/exceptions.dart';
import '../models/user.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthService(this._dio, this._storage);

  /// Sign up new user
  Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/signup',
        data: {
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
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
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
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
    try {
      await _dio.post('/auth/logout');
    } finally {
      await _clearTokens();
    }
  }

  /// Get stored access token
  Future<String?> getAccessToken() {
    return _storage.read(key: Config.accessTokenKey);
  }

  /// Get stored refresh token
  Future<String?> getRefreshToken() {
    return _storage.read(key: Config.refreshTokenKey);
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
