import 'package:dio/dio.dart';
import '../config/config.dart';
import '../core/exceptions.dart';
import '../models/payment.dart';

class PaymentService {
  final Dio _dio;

  PaymentService(this._dio);

  /// Create payment order
  Future<Payment> createPayment({
    required double amount,
    String? description,
  }) async {
    try {
      final response = await _dio.post(
        '/payments/create-order',
        data: {
          'amount': amount,
          'description': description,
        },
      );

      if (response.statusCode == 201) {
        return Payment.fromJson(response.data['data']);
      }
      throw PaymentException(
        response.data['message'] ?? 'Failed to create payment',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Get payment status
  Future<Payment> getPaymentStatus(String paymentId) async {
    try {
      final response = await _dio.get('/payments/status/$paymentId');

      if (response.statusCode == 200) {
        return Payment.fromJson(response.data['data']);
      }
      throw PaymentException(
        'Failed to fetch payment status',
        paymentId: paymentId,
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Get payment history
  Future<Map<String, dynamic>> getPaymentHistory({
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final response = await _dio.get(
        '/payments/history',
        queryParameters: {
          'limit': limit,
          'offset': offset,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        return {
          'payments': (data['payments'] as List)
              .map((p) => Payment.fromJson(p))
              .toList(),
          'total': data['total'] as int,
          'limit': data['limit'] as int,
          'offset': data['offset'] as int,
        };
      }
      throw PaymentException('Failed to fetch payment history');
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  /// Handle DioException
  void _handleDioException(DioException e) {
    if (e.response?.statusCode == 404) {
      throw PaymentException('Payment not found');
    } else if (e.response?.statusCode == 401) {
      throw PaymentException('Unauthorized - please login again');
    } else if (e.response?.statusCode == 429) {
      throw PaymentException('Too many payment requests. Please try again later.');
    } else {
      throw PaymentException(
        e.message ?? 'Network error',
      );
    }
  }
}
