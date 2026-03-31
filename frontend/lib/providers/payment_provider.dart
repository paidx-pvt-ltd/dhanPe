import 'package:flutter/material.dart';
import '../models/payment.dart';
import '../models/transaction.dart';
import '../services/payment_service.dart';
import '../core/exceptions.dart';

class PaymentProvider extends ChangeNotifier {
  final PaymentService _paymentService;

  Payment? _currentPayment;
  List<Payment> _paymentHistory = [];
  final List<Transaction> _transactions = [];
  bool _isLoading = false;
  String? _error;

  PaymentProvider(this._paymentService);

  // Getters
  Payment? get currentPayment => _currentPayment;
  List<Payment> get paymentHistory => _paymentHistory;
  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Create payment order
  Future<void> createPayment({
    required double amount,
    String? description,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentPayment = await _paymentService.createPayment(
        amount: amount,
        description: description,
      );
    } on PaymentException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to create payment: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get payment status
  Future<void> getPaymentStatus(String paymentId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentPayment = await _paymentService.getPaymentStatus(paymentId);
    } on PaymentException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to fetch payment status';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh payment status
  Future<void> refreshPaymentStatus() async {
    if (_currentPayment == null) return;
    await getPaymentStatus(_currentPayment!.id);
  }

  /// Load payment history
  Future<void> loadPaymentHistory({int limit = 20, int offset = 0}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _paymentService.getPaymentHistory(
        limit: limit,
        offset: offset,
      );
      _paymentHistory = result['payments'] as List<Payment>;
    } on PaymentException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to load payment history';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentPayment() {
    _currentPayment = null;
    notifyListeners();
  }
}
