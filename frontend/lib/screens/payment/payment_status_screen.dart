import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../models/transaction.dart';
import '../../providers/payment_provider.dart';
import '../../services/service_locator.dart';
import '../../services/transaction_service.dart';
import '../../widgets/kinetic_primitives.dart';

class PaymentStatusScreen extends StatefulWidget {
  const PaymentStatusScreen({super.key, required this.paymentId});

  final String paymentId;

  @override
  State<PaymentStatusScreen> createState() => _PaymentStatusScreenState();
}

class _PaymentStatusScreenState extends State<PaymentStatusScreen> {
  late Future<Transaction> _future;
  final _transactionService = getIt<TransactionService>();

  @override
  void initState() {
    super.initState();
    _future = _transactionService.getTransaction(widget.paymentId);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
      children: [
        Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.arrow_back_ios_new_rounded),
            ),
            const Expanded(
              child: SectionHeading(
                title: 'Payment detail',
                subtitle: 'Payment lifecycle and settlement status',
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        FutureBuilder<Transaction>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Container(
                height: 320,
                decoration: AppTheme.panel(color: AppColors.surfaceLow),
              );
            }

            if (snapshot.hasError || !snapshot.hasData) {
              return KineticPanel(
                color: AppColors.surfaceLow,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Payment unavailable',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'We could not load this payment right now.',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textMuted),
                    ),
                  ],
                ),
              );
            }

            final transaction = snapshot.data!;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                KineticPanel(
                  glass: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          StatusBadge(
                            label: transaction.status,
                            color: transaction.isFailed
                                ? AppColors.warning
                                : transaction.isCompleted
                                    ? AppColors.success
                                    : AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: transaction.payoutStatus,
                            color: AppColors.secondary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(transaction.amount),
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        transaction.title,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Created ${DateFormat('MMM d, yyyy | h:mm a').format(transaction.createdAt)}',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _FlowTimeline(transaction: transaction),
                const SizedBox(height: 16),
                KineticPanel(
                  color: AppColors.surfaceHigh,
                  child: Column(
                    children: [
                      _DetailRow(label: 'Order ID', value: transaction.orderId),
                      _DetailRow(label: 'Gateway', value: transaction.paymentProvider),
                      _DetailRow(label: 'Lifecycle', value: transaction.lifecycleState),
                      _DetailRow(
                        label: 'Net settlement',
                        value: NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(transaction.netPayoutAmount),
                      ),
                      _DetailRow(
                        label: 'Platform fee',
                        value: NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(transaction.platformFeeAmount),
                      ),
                      if (transaction.beneficiary != null)
                        _DetailRow(
                          label: 'Linked account',
                          value:
                              '${transaction.beneficiary!.title} | ${transaction.beneficiary!.accountNumberMask}',
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                KineticPanel(
                  color: AppColors.surfaceLow,
                  child: Text(
                    'This operation is processed as a bill payment settlement, not a cash withdrawal.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ),
                if (transaction.payout != null) ...[
                  const SizedBox(height: 16),
                  KineticPanel(
                    color: AppColors.surfaceLow,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Settlement status', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text(
                          transaction.payout!.providerStatus ?? transaction.payout!.status,
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(color: AppColors.textMuted),
                        ),
                        if (transaction.payout!.failureReason != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            transaction.payout!.failureReason!,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: AppColors.warning),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                if (transaction.refunds.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  KineticPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Refund updates', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ...transaction.refunds.map(
                          (refund) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _MiniStatusRow(
                              title: refund.status,
                              subtitle: refund.reason ?? refund.refundId,
                              value: NumberFormat.currency(
                                symbol: 'INR ',
                                decimalDigits: 2,
                              ).format(refund.amount),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (transaction.disputes.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  KineticPanel(
                    color: AppColors.surfaceLow,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Dispute cases', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ...transaction.disputes.map(
                          (dispute) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _MiniStatusRow(
                              title: '${dispute.phase} | ${dispute.status}',
                              subtitle: dispute.reasonMessage ?? dispute.disputeId,
                              value: NumberFormat.currency(
                                symbol: 'INR ',
                                decimalDigits: 2,
                              ).format(dispute.amount),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (transaction.reconciliation.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  KineticPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Reconciliation', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ...transaction.reconciliation.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _MiniStatusRow(
                              title: '${item.severity} | ${item.status}',
                              subtitle: item.message,
                              value: item.scope,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (transaction.isCompleted && transaction.refunds.isEmpty) ...[
                  const SizedBox(height: 16),
                  Consumer<PaymentProvider>(
                    builder: (context, paymentProvider, _) {
                      return GradientButton(
                        label: 'Request full refund',
                        icon: Icons.keyboard_return_rounded,
                        isLoading: paymentProvider.isLoading,
                        onPressed: () => _requestRefund(transaction),
                      );
                    },
                  ),
                ],
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _requestRefund(Transaction transaction) async {
    final paymentProvider = context.read<PaymentProvider>();
    await paymentProvider.createRefund(
      transactionId: transaction.id,
      amount: transaction.amount,
      reason: 'Requested from the mobile app',
    );

    if (!mounted) {
      return;
    }

    if (paymentProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(paymentProvider.error!)),
      );
      return;
    }

    setState(() {
      _future = _transactionService.getTransaction(widget.paymentId);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Refund initiated. We will update status shortly.')),
    );
  }
}

class _FlowTimeline extends StatelessWidget {
  const _FlowTimeline({required this.transaction});

  final Transaction transaction;

  @override
  Widget build(BuildContext context) {
    final states = <String>[
      'PAYMENT_PENDING',
      'PAYOUT_PENDING',
      'PAYOUT_SUCCESS',
      'COMPLETED',
    ];
    final labels = <String>[
      'Payment initiated',
      'Processing',
      'Settlement',
      'Completion',
    ];
    final currentIndex = states.indexOf(transaction.lifecycleState);

    return KineticPanel(
      color: AppColors.surfaceLow,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Transaction flow', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          for (var i = 0; i < labels.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    i <= currentIndex ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                    size: 18,
                    color: i <= currentIndex ? AppColors.success : AppColors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      labels[i],
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 6),
          Text(
            _edgeCaseHint(transaction),
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  String _edgeCaseHint(Transaction transaction) {
    if (transaction.lifecycleState == 'PAYMENT_FAILED') {
      return 'Payment failed. No settlement will be attempted.';
    }
    if (transaction.lifecycleState == 'PAYOUT_FAILED') {
      return 'Settlement delayed or failed. Support can help with next steps.';
    }
    if (transaction.lifecycleState == 'REFUNDED') {
      return 'Refund initiated successfully.';
    }
    if (transaction.lifecycleState == 'DISPUTED') {
      return 'This payment is currently under dispute review.';
    }
    return 'Settlement usually completes by T+1 depending on banking rails.';
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: AppColors.textMuted),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniStatusRow extends StatelessWidget {
  const _MiniStatusRow({
    required this.title,
    required this.subtitle,
    required this.value,
  });

  final String title;
  final String subtitle;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Text(value, style: Theme.of(context).textTheme.labelLarge),
      ],
    );
  }
}
