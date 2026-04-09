import 'package:dio/dio.dart';
import '../core/exceptions.dart';
import '../models/payment.dart';

class PaymentService {
  final Dio _dio;

  PaymentService(this._dio);

  Future<Payment> createPayment({
    required double amount,
    String? beneficiaryId,
    String? accountHolderName,
    String? bankAccountRef,
    String? ifsc,
    String? bankName,
    String? description,
  }) async {
    try {
      _ensureSensitiveTransport();
      final hasBeneficiary = beneficiaryId != null && beneficiaryId.trim().isNotEmpty;
      final response = await _dio.post(
        '/transfer',
        data: {
          'amount': amount,
          'description': description,
          if (hasBeneficiary)
            'beneficiaryId': beneficiaryId.trim()
          else
            'bankAccount': {
              'accountHolderName': accountHolderName,
              'accountNumber': bankAccountRef,
              'ifsc': ifsc,
              if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
            },
        },
        options: Options(
          headers: {
            'x-idempotency-key': _buildIdempotencyKey(amount),
          },
        ),
      );

      if (response.statusCode == 201) {
        return Payment.fromJson(response.data['data'] as Map<String, dynamic>);
      }

      String? message;
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final error = data['error'];
        if (error is Map<String, dynamic>) {
          message = error['message']?.toString();
        }
        message ??= data['message']?.toString();
      }

      throw PaymentException(
        message ?? 'Failed to create transfer',
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Payment> getPaymentStatus(String transactionId) async {
    try {
      final response = await _dio.get('/transaction/$transactionId');

      if (response.statusCode == 200) {
        return Payment.fromJson(response.data['data'] as Map<String, dynamic>);
      }

      throw PaymentException(
        'Failed to fetch transfer status',
        paymentId: transactionId,
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Payment> syncPaymentStatus(String transactionId) {
    return getPaymentStatus(transactionId);
  }

  Future<void> createRefund({
    required String transactionId,
    double? amount,
    String? reason,
  }) async {
    try {
      await _dio.post(
        '/refund/$transactionId',
        data: {
          if (amount != null) 'amount': amount,
          if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        },
      );
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  String _buildIdempotencyKey(
    double amount,
  ) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final entropy = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    return 'transfer-$timestamp-$entropy-${amount.toStringAsFixed(2)}';
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

    if (e.response?.statusCode == 404) {
      throw PaymentException(
        message ?? 'Transfer not found',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 401) {
      throw PaymentException(
        message ?? 'Unauthorized - please login again',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 422) {
      throw PaymentException(
        message ?? 'Transfer request was rejected',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 429) {
      throw PaymentException(
        message ?? 'Too many transfer requests. Please try again later.',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else if (e.response?.statusCode == 400) {
      throw PaymentException(
        message ?? 'Invalid transfer request',
        code: e.response?.data['error']?['code']?.toString(),
      );
    } else {
      throw PaymentException(
        message ?? e.message ?? 'Network error',
        code: e.response?.data['error']?['code']?.toString(),
      );
    }
  }

  void _ensureSensitiveTransport() {
    final target = Uri.tryParse(_dio.options.baseUrl);
    if (target == null) {
      throw PaymentException('Invalid backend URL configuration');
    }

    final isLoopback = target.host == '127.0.0.1' ||
        target.host == 'localhost' ||
        target.host == '10.0.2.2';
    if (target.scheme != 'https' && !isLoopback) {
      throw PaymentException('Insecure backend URL blocked for transfer operation');
    }
  }
}
