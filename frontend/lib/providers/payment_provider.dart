import 'package:flutter/material.dart';
import '../models/payment.dart';
import '../services/payment_service.dart';
import '../core/exceptions.dart';

class PaymentProvider extends ChangeNotifier {
  final PaymentService _paymentService;

  Payment? _currentPayment;
  bool _isLoading = false;
  String? _error;

  PaymentProvider(this._paymentService);

  // Getters
  Payment? get currentPayment => _currentPayment;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Create payment order
  Future<void> createPayment({
    required double amount,
    required String accountHolderName,
    required String accountNumber,
    required String ifsc,
    String? bankName,
    String? description,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentPayment = await _paymentService.createPayment(
        amount: amount,
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
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

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentPayment() {
    _currentPayment = null;
    notifyListeners();
  }
}
