import 'package:flutter/material.dart';
import '../../core/exceptions.dart';
import '../../models/transaction.dart';
import '../../services/service_locator.dart';
import '../../services/transaction_service.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _transactionService = getIt<TransactionService>();
  final _transactionIdController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  Transaction? _transaction;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _transactionIdController.dispose();
    super.dispose();
  }

  Future<void> _lookupTransaction() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final transaction = await _transactionService.getTransaction(
        _transactionIdController.text.trim(),
      );

      setState(() {
        _transaction = transaction;
      });
    } on ApiError catch (e) {
      setState(() {
        _transaction = null;
        _error = e.message;
      });
    } catch (_) {
      setState(() {
        _transaction = null;
        _error = 'Failed to fetch transaction lifecycle';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Track Transfer'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Lookup a backend transaction by ID',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Form(
              key: _formKey,
              child: Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _transactionIdController,
                      decoration: const InputDecoration(
                        labelText: 'Transaction ID',
                        prefixIcon: Icon(Icons.tag),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Transaction ID is required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _lookupTransaction,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Search'),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 20),
              Text(
                _error!,
                style: const TextStyle(color: Colors.red),
              ),
            ],
            if (_transaction != null) ...[
              const SizedBox(height: 24),
              _LifecycleCard(transaction: _transaction!),
            ],
          ],
        ),
      ),
    );
  }
}

class _LifecycleCard extends StatelessWidget {
  final Transaction transaction;

  const _LifecycleCard({required this.transaction});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Lifecycle Details',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            _DetailRow(label: 'Transaction ID', value: transaction.id),
            _DetailRow(label: 'Order ID', value: transaction.orderId),
            _DetailRow(label: 'Provider', value: transaction.paymentProvider),
            _DetailRow(label: 'Status', value: transaction.status),
            _DetailRow(label: 'Payout', value: transaction.payoutStatus),
            _DetailRow(
              label: 'Amount',
              value: 'Rs ${transaction.amount.toStringAsFixed(2)}',
            ),
            if (transaction.description != null)
              _DetailRow(label: 'Description', value: transaction.description!),
            _DetailRow(
              label: 'Ledger entries',
              value: transaction.ledger.length.toString(),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
