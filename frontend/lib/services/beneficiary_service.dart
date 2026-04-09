import 'package:dio/dio.dart';

import '../core/exceptions.dart';
import '../models/beneficiary.dart';

class BeneficiaryService {
  BeneficiaryService(this._dio);

  final Dio _dio;

  Future<List<Beneficiary>> listBeneficiaries() async {
    try {
      final response = await _dio.get('/users/beneficiaries');
      final items = response.data['data'] as List<dynamic>? ?? const [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(Beneficiary.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiError(
        type: ApiException.networkError,
        message: _messageFromResponse(error) ?? 'Failed to load beneficiaries',
      );
    }
  }

  Future<Beneficiary> createBeneficiary({
    required String accountHolderName,
    required String accountNumber,
    required String ifsc,
    String? bankName,
    String? label,
  }) async {
    try {
      final response = await _dio.post(
        '/users/beneficiaries',
        data: {
          'accountHolderName': accountHolderName,
          'accountNumber': accountNumber,
          'ifsc': ifsc,
          if (bankName != null && bankName.trim().isNotEmpty) 'bankName': bankName.trim(),
          if (label != null && label.trim().isNotEmpty) 'label': label.trim(),
        },
      );

      return Beneficiary.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (error) {
      throw ApiError(
        type: ApiException.networkError,
        message: _messageFromResponse(error) ?? 'Failed to create beneficiary',
      );
    }
  }

  String? _messageFromResponse(DioException error) {
    final response = error.response?.data;
    if (response is Map<String, dynamic>) {
      final nestedError = response['error'];
      if (nestedError is Map<String, dynamic>) {
        return nestedError['message']?.toString();
      }
      return response['message']?.toString();
    }
    return error.message;
  }
}
