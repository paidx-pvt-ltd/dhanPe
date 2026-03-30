import 'package:flutter/material.dart';
import '../../services/transaction_service.dart';
import '../../models/transaction.dart';
import '../../services/service_locator.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({Key? key}) : super(key: key);

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _transactionService = getIt<TransactionService>();
  late Future<Map<String, dynamic>> _transactionsFuture;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  void _loadTransactions() {
    String? type;
    if (_selectedFilter == 'Debit') type = 'DEBIT';
    if (_selectedFilter == 'Credit') type = 'CREDIT';

    _transactionsFuture = _transactionService.getTransactions(type: type);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaction History'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: ['All', 'Debit', 'Credit'].map((filter) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: FilterChip(
                      label: Text(filter),
                      selected: _selectedFilter == filter,
                      onSelected: (selected) {
                        setState(() => _selectedFilter = filter);
                        _loadTransactions();
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            // Transactions List
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: _transactionsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 64,
                            color: Colors.red,
                          ),
                          const SizedBox(height: 16),
                          Text(snapshot.error.toString()),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _loadTransactions,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    );
                  }

                  final data = snapshot.data;
                  final transactions = data?['transactions'] as List<Transaction>? ?? [];

                  if (transactions.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.history,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No transactions yet',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: transactions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final transaction = transactions[index];
                      return _TransactionCard(transaction: transaction);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final Transaction transaction;

  const _TransactionCard({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final isDebit = transaction.isDebit;
    final isSuccess = transaction.isSuccess;

    return Card(
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isDebit ? Colors.red[50] : Colors.green[50],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            isDebit ? Icons.arrow_upward : Icons.arrow_downward,
            color: isDebit ? Colors.red : Colors.green,
          ),
        ),
        title: Text(
          transaction.type,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        subtitle: Text(
          transaction.description ?? 'Transaction',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${isDebit ? '-' : '+'}₹${transaction.amount.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDebit ? Colors.red : Colors.green,
                  ),
            ),
            Text(
              transaction.status,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isSuccess ? Colors.green : Colors.orange,
                  ),
            ),
          ],
        ),
        onTap: () {
          showModalBottomSheet(
            context: context,
            builder: (context) => _TransactionDetailsSheet(
              transaction: transaction,
            ),
          );
        },
      ),
    );
  }
}

class _TransactionDetailsSheet extends StatelessWidget {
  final Transaction transaction;

  const _TransactionDetailsSheet({required this.transaction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),
          Text(
            'Transaction Details',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 24),
          _DetailRow(label: 'Type', value: transaction.type),
          _DetailRow(label: 'Amount', value: '₹${transaction.amount.toStringAsFixed(2)}'),
          _DetailRow(label: 'Status', value: transaction.status),
          _DetailRow(
            label: 'Date',
            value:
                '${transaction.createdAt.day}/${transaction.createdAt.month}/${transaction.createdAt.year}',
          ),
          if (transaction.description != null)
            _DetailRow(label: 'Description', value: transaction.description!),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ),
        ],
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}
