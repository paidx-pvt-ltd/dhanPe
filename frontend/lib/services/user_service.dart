import 'package:dio/dio.dart';
import '../core/exceptions.dart';
import '../models/kyc_session.dart';
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
    final profile = await getProfile();
    return profile.balance;
  }

  /// Update user profile
  Future<User> updateProfile({
    required String firstName,
    required String lastName,
    String? contactNumber,
    String? addressLine1,
    String? city,
    String? state,
    String? postalCode,
    String? countryCode,
  }) async {
    try {
      _ensureSensitiveTransport();
      final payload = <String, String>{
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        if (contactNumber != null && contactNumber.trim().isNotEmpty)
          'phoneNumber': contactNumber.trim(),
        if (addressLine1 != null && addressLine1.trim().isNotEmpty)
          'addressLine1': addressLine1.trim(),
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        if (state != null && state.trim().isNotEmpty) 'state': state.trim(),
        if (postalCode != null && postalCode.trim().isNotEmpty)
          'postalCode': postalCode.trim(),
        if (countryCode != null && countryCode.trim().isNotEmpty)
          'countryCode': countryCode.trim(),
      };
      final response = await _dio.patch(
        '/users/profile',
        data: payload,
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

  Future<KycSession> createKycSession() async {
    try {
      final response = await _dio.post('/users/kyc/session');

      if (response.statusCode == 201) {
        return KycSession.fromJson(response.data['data']);
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to create verification session',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<User> syncKycSession(String sessionId) async {
    try {
      final response = await _dio.post('/users/kyc/session/$sessionId/sync');

      if (response.statusCode == 200) {
        return User.fromJson(response.data['data']['profile']);
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to sync identity verification status',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<User> submitPan({
    required String panNumber,
    String? legalName,
  }) async {
    try {
      _ensureSensitiveTransport();
      final response = await _dio.post(
        '/users/pan',
        data: {
          'panNumber': panNumber.trim().toUpperCase(),
          if (legalName != null && legalName.trim().isNotEmpty) 'legalName': legalName.trim(),
        },
      );

      if (response.statusCode == 201) {
        return getProfile();
      }

      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to verify PAN',
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
    } else if (e.response?.statusCode == 400) {
      throw ApiError(
        type: ApiException.validationError,
        message: e.response?.data['error']?['message']?.toString() ?? 'Invalid request',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 422) {
      throw ApiError(
        type: ApiException.validationError,
        message: e.response?.data['error']?['message']?.toString() ?? 'Request rejected',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message:
            e.response?.data['error']?['message']?.toString() ?? e.message ?? 'Network error',
        code: e.response?.data['error']?['code']?.toString(),
      );
    }
  }

  void _ensureSensitiveTransport() {
    final target = Uri.tryParse(_dio.options.baseUrl);
    if (target == null) {
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Invalid backend URL configuration',
      );
    }

    final isLoopback = target.host == '127.0.0.1' ||
        target.host == 'localhost' ||
        target.host == '10.0.2.2';
    if (target.scheme != 'https' && !isLoopback) {
      throw ApiError(
        type: ApiException.networkError,
        message: 'Insecure backend URL blocked for profile update',
      );
    }
  }
}
