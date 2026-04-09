import 'package:flutter/material.dart';
import '../models/payment.dart';
import '../services/cashfree_service.dart';
import '../services/payment_service.dart';
import '../core/exceptions.dart';

class PaymentProvider extends ChangeNotifier {
  final PaymentService _paymentService;
  final CashfreeService _cashfreeService;

  Payment? _currentPayment;
  bool _isLoading = false;
  String? _error;
  String? _errorCode;

  PaymentProvider(this._paymentService, this._cashfreeService);

  // Getters
  Payment? get currentPayment => _currentPayment;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get errorCode => _errorCode;

  /// Create payment order
  Future<void> createPayment({
    required double amount,
    String? beneficiaryId,
    String? accountHolderName,
    String? bankAccountRef,
    String? ifsc,
    required bool useSandbox,
    String? bankName,
    String? description,
  }) async {
    _isLoading = true;
    _error = null;
    _errorCode = null;
    _currentPayment = null;
    notifyListeners();

    try {
      _currentPayment = await _paymentService.createPayment(
        amount: amount,
        beneficiaryId: beneficiaryId,
        accountHolderName: accountHolderName,
        bankAccountRef: bankAccountRef,
        ifsc: ifsc,
        bankName: bankName,
        description: description,
      );
      await _cashfreeService.launchCheckout(
        _currentPayment!,
        useSandbox: useSandbox,
      );
    } on PaymentException catch (e) {
      _currentPayment = null;
      _error = e.message;
      _errorCode = e.code;
    } catch (e) {
      _currentPayment = null;
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
    _errorCode = null;
    notifyListeners();

    try {
      _currentPayment = await _paymentService.getPaymentStatus(paymentId);
    } on PaymentException catch (e) {
      _error = e.message;
      _errorCode = e.code;
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

  Future<void> createRefund({
    required String transactionId,
    double? amount,
    String? reason,
  }) async {
    _isLoading = true;
    _error = null;
    _errorCode = null;
    notifyListeners();

    try {
      await _paymentService.createRefund(
        transactionId: transactionId,
        amount: amount,
        reason: reason,
      );
    } on PaymentException catch (e) {
      _error = e.message;
      _errorCode = e.code;
    } catch (e) {
      _error = 'Failed to request refund: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    _errorCode = null;
    notifyListeners();
  }

  void clearCurrentPayment() {
    _currentPayment = null;
    notifyListeners();
  }
}
