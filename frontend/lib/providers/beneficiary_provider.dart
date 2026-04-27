import 'package:flutter/foundation.dart';

import '../core/exceptions.dart';
import '../models/beneficiary.dart';
import '../services/beneficiary_service.dart';

class BeneficiaryProvider extends ChangeNotifier {
  BeneficiaryProvider(this._beneficiaryService);

  final BeneficiaryService _beneficiaryService;

  List<Beneficiary> _beneficiaries = const [];
  bool _isLoading = false;
  String? _error;

  List<Beneficiary> get beneficiaries => _beneficiaries;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadBeneficiaries() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _beneficiaries = await _beneficiaryService.listBeneficiaries();
    } on ApiError catch (error) {
      _error = error.message;
    } catch (_) {
      _error = 'Failed to load saved beneficiaries';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Beneficiary?> createBeneficiary({
    required String accountHolderName,
    required String accountNumber,
    required String ifsc,
    String? bankName,
    String? label,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final beneficiary = await _beneficiaryService.createBeneficiary(
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        label: label,
      );
      _beneficiaries = [
        beneficiary,
        ..._beneficiaries.where((item) => item.id != beneficiary.id),
      ];
      return beneficiary;
    } on ApiError catch (error) {
      _error = error.message;
    } catch (_) {
      _error = 'Failed to save beneficiary';
    } finally {
      _isLoading = false;
      notifyListeners();
    }

    return null;
  }
}
