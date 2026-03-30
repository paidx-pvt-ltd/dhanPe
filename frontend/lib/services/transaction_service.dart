import 'package:dio/dio.dart';
import '../core/exceptions.dart';
import '../models/transaction.dart';

class TransactionService {
  final Dio _dio;

  TransactionService(this._dio);

  /// Get user transactions
  Future<Map<String, dynamic>> getTransactions({
    String? type, // DEBIT, CREDIT, REFUND
    String? status, // PENDING, SUCCESS, FAILED
    DateTime? startDate,
    DateTime? endDate,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit,
        'offset': offset,
      };

      if (type != null) queryParams['type'] = type;
      if (status != null) queryParams['status'] = status;
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final response = await _dio.get(
        '/transactions',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        return {
          'transactions': (data['transactions'] as List)
              .map((t) => Transaction.fromJson(t))
              .toList(),
          'total': data['total'] as int,
          'limit': data['limit'] as int,
          'offset': data['offset'] as int,
        };
      }
      throw ApiError(
        type: ApiException.unknownError,
        message: 'Failed to fetch transactions',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Get transaction details
  Future<Transaction> getTransaction(String transactionId) async {
    try {
      final response = await _dio.get('/transactions/$transactionId');

      if (response.statusCode == 200) {
        return Transaction.fromJson(response.data['data']);
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

  /// Handle DioException
  void _handleDioException(DioException e) {
    if (e.response?.statusCode == 401) {
      throw ApiError(
        type: ApiException.unauthorizedError,
        message: 'Unauthorized',
      );
    } else if (e.response?.statusCode == 404) {
      throw ApiError(
        type: ApiException.notFoundError,
        message: 'Resource not found',
      );
    } else {
      throw ApiError(
        type: ApiException.networkError,
        message: e.message ?? 'Network error',
      );
    }
  }
}
