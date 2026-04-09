import 'package:flutter/foundation.dart';

import '../core/exceptions.dart';
import '../models/transaction.dart';
import '../services/transaction_service.dart';

class TransactionsProvider extends ChangeNotifier {
  TransactionsProvider(this._transactionService);

  final TransactionService _transactionService;

  List<TransactionSummary> _recentTransactions = const [];
  bool _isLoading = false;
  String? _error;

  List<TransactionSummary> get recentTransactions => _recentTransactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadRecentTransactions({int limit = 12}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _recentTransactions = await _transactionService.listTransactions(limit: limit);
    } on ApiError catch (error) {
      _error = error.message;
    } catch (_) {
      _error = 'Failed to load transfers';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
