import 'package:dio/dio.dart';
import '../core/exceptions.dart';
import '../models/transaction.dart';

class TransactionService {
  final Dio _dio;

  TransactionService(this._dio);

  Future<List<TransactionSummary>> listTransactions({int limit = 12}) async {
    try {
      final response = await _dio.get(
        '/transaction',
        queryParameters: {'limit': limit},
      );

      final items = response.data['data'] as List<dynamic>? ?? const [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(TransactionSummary.fromJson)
          .toList();
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Transaction> getTransaction(String transactionId) async {
    try {
      final response = await _dio.get('/transaction/$transactionId');

      if (response.statusCode == 200) {
        return Transaction.fromJson(
          response.data['data'] as Map<String, dynamic>,
        );
      }

      throw ApiError(
        type: ApiException.notFoundError,
        message: 'Transaction not found',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  void _handleDioException(DioException e) {
    final response = e.response?.data;
    String? message;

    if (response is Map<String, dynamic>) {
      final error = response['error'];
      if (error is Map<String, dynamic>) {
        message = error['message']?.toString();
      }
      message ??= response['message']?.toString();
    }

    if (e.response?.statusCode == 401) {
      throw ApiError(
        type: ApiException.unauthorizedError,
        message: message ?? 'Unauthorized',
      );
    } else if (e.response?.statusCode == 404) {
      throw ApiError(
        type: ApiException.notFoundError,
        message: message ?? 'Transaction not found',
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message: message ?? e.message ?? 'Network error',
      );
    }
  }
}
