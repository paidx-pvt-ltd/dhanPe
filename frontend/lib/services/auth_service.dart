import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/config.dart';
import '../core/exceptions.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthService(this._dio, this._storage);

  Future<void> sendOtp({required String mobileNumber}) async {
    try {
      await _dio.post('/auth/send-otp', data: {'mobileNumber': mobileNumber});
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    try {
      _ensureSensitiveTransport();
      final response = await _dio.post(
        '/auth/verify-otp',
        data: {'mobileNumber': mobileNumber, 'otp': otp},
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
        message: response.data['message'] ?? 'Authentication failed',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException(
        'Session storage failed. Clear browser site data and try again.',
      );
    }
  }

  /// Refresh access token
  Future<Map<String, dynamic>> refreshToken() async {
    try {
      _ensureSensitiveTransport();
      final refreshToken = await _storage.read(key: Config.refreshTokenKey);

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
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException(
        'Session restore failed. Clear browser site data and login again.',
      );
    }
  }

  /// Logout user
  Future<void> logout() async {
    await _clearTokens();
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: Config.accessTokenKey);
    } catch (_) {
      return null;
    }
  }

  /// Get stored refresh token
  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: Config.refreshTokenKey);
    } catch (_) {
      return null;
    }
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
    try {
      await Future.wait([
        _storage.write(key: Config.accessTokenKey, value: accessToken),
        _storage.write(key: Config.refreshTokenKey, value: refreshToken),
      ]);
    } catch (_) {
      throw AuthException(
        'Session storage failed. Clear browser site data and try again.',
      );
    }
  }

  /// Clear stored tokens
  Future<void> _clearTokens() async {
    try {
      await Future.wait([
        _storage.delete(key: Config.accessTokenKey),
        _storage.delete(key: Config.refreshTokenKey),
      ]);
    } catch (_) {
      // Ignore storage cleanup failures to avoid blocking logout/reset flows.
    }
  }

  void _ensureSensitiveTransport() {
    final target = Uri.tryParse(_dio.options.baseUrl);
    if (target == null) {
      throw AuthException('Invalid backend URL configuration');
    }

    final isLoopback =
        target.host == '127.0.0.1' ||
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
      throw AuthException(
        e.response?.data['error']?['message']?.toString() ??
            'Unauthorized. Please login again.',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 400) {
      throw ApiError(
        type: ApiException.validationError,
        message:
            e.response?.data['error']?['message']?.toString() ??
            'Validation error',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message:
            e.response?.data['error']?['message']?.toString() ??
            e.message ??
            'Network error',
        code: e.response?.data['error']?['code']?.toString(),
      );
    }
  }
}
