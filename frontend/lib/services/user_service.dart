import 'package:dio/dio.dart';
import '../core/exceptions.dart';
import '../models/user.dart';

class UserService {
  final Dio _dio;

  UserService(this._dio);

  /// Get user profile
  Future<User> getProfile() async {
    try {
      final response = await _dio.get('/users/profile');

      if (response.statusCode == 200) {
        return User.fromJson(response.data['data']);
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to fetch profile',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Get user balance
  Future<double> getBalance() async {
    try {
      final response = await _dio.get('/users/balance');

      if (response.statusCode == 200) {
        return (response.data['data']['balance'] as num).toDouble();
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to fetch balance',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Update user profile
  Future<User> updateProfile({
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    try {
      final response = await _dio.patch(
        '/users/profile',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'phoneNumber': phoneNumber,
        },
      );

      if (response.statusCode == 200) {
        return User.fromJson(response.data['data']);
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to update profile',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Handle DioException
  void _handleDioException(DioException e) {
    if (e.response?.statusCode == 404) {
      throw ApiError(
        type: ApiException.notFoundError,
        message: 'User not found',
      );
    } else if (e.response?.statusCode == 401) {
      throw ApiError(
        type: ApiException.unauthorizedError,
        message: 'Unauthorized',
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message: e.message ?? 'Network error',
      );
    }
  }
}
