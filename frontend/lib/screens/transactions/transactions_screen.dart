import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../models/transaction.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TransactionsProvider>().loadRecentTransactions(limit: 50);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TransactionsProvider>(
      builder: (context, provider, _) {
        final items = provider.recentTransactions.where((transaction) {
          if (_query.isEmpty) {
            return true;
          }
          final haystack =
              '${transaction.title} ${transaction.orderId} ${transaction.status} ${transaction.payoutStatus}'
                  .toLowerCase();
          return haystack.contains(_query.toLowerCase());
        }).toList();

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
          children: [
            SectionHeading(
              title: 'Transfers',
              subtitle: provider.error ?? 'All recent transfer activity',
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value),
              decoration: const InputDecoration(
                hintText: 'Search transfer, order, or status',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
            const SizedBox(height: 20),
            if (provider.isLoading && provider.recentTransactions.isEmpty)
              const _TransactionsLoading()
            else if (items.isEmpty)
              KineticPanel(
                color: AppColors.surfaceLow,
                child: Text(
                  'No transfers match your search.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              )
            else
              ...items.map(
                (transaction) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppTheme.lgRadius),
                    onTap: () => context.push('/transfers/${transaction.id}'),
                    child: _TransactionTile(transaction: transaction),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.transaction});

  final TransactionSummary transaction;

  @override
  Widget build(BuildContext context) {
    return KineticPanel(
      color: transaction.isCompleted ? AppColors.surfaceHigh : AppColors.surfaceLow,
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.surfaceHighest,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(
              transaction.isFailed
                  ? Icons.error_outline_rounded
                  : transaction.isCompleted
                      ? Icons.check_circle_outline_rounded
                      : Icons.sync_rounded,
              color: transaction.isFailed
                  ? AppColors.warning
                  : transaction.isCompleted
                      ? AppColors.success
                      : AppColors.primary,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(transaction.title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  '${transaction.orderId} • ${DateFormat('MMM d, h:mm a').format(transaction.createdAt)}',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                NumberFormat.currency(symbol: 'INR ', decimalDigits: 2).format(transaction.amount),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${transaction.status} / ${transaction.payoutStatus}',
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TransactionsLoading extends StatelessWidget {
  const _TransactionsLoading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        5,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            height: 92,
            decoration: AppTheme.panel(color: AppColors.surfaceLow),
          ),
        ),
      ),
    );
  }
}
