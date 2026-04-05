import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/payment_provider.dart';

class PaymentStatusScreen extends StatefulWidget {
  const PaymentStatusScreen({super.key, required this.paymentId});

  final String paymentId;

  @override
  State<PaymentStatusScreen> createState() => _PaymentStatusScreenState();
}

class _PaymentStatusScreenState extends State<PaymentStatusScreen> {
  late Future<void> _paymentStatusFuture;

  @override
  void initState() {
    super.initState();
    _paymentStatusFuture =
        context.read<PaymentProvider>().getPaymentStatus(widget.paymentId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<void>(
        future: _paymentStatusFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          return Consumer<PaymentProvider>(
            builder: (context, paymentProvider, _) {
              final payment = paymentProvider.currentPayment;
              if (payment == null) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 64,
                          color: AppColors.warning,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'We couldn'
                          't find that transfer.',
                          style: Theme.of(context).textTheme.headlineSmall,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () => context.go('/dashboard'),
                          child: const Text('Back to Dashboard'),
                        ),
                      ],
                    ),
                  ),
                );
              }

              final expected = payment.createdAt.add(const Duration(days: 2));
              final progress = payment.isSuccess
                  ? 1.0
                  : payment.isFailed
                      ? 0.2
                      : 0.62;

              return SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 36, 20, 28),
                  child: Column(
                    children: [
                      const Spacer(),
                      Container(
                        width: 190,
                        height: 190,
                        decoration: BoxDecoration(
                          color: AppColors.lightBlue,
                          shape: BoxShape.circle,
                          boxShadow: AppTheme.softShadow(),
                        ),
                        child: const Icon(
                          Icons.near_me_rounded,
                          size: 76,
                          color: AppColors.primaryBright,
                        ),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        payment.isFailed
                            ? 'This one needs another try'
                            : 'It\'s on the way!',
                        style: Theme.of(context)
                            .textTheme
                            .headlineMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 28),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: AppTheme.softShadow(),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.event_available_rounded,
                                  color: AppColors.primaryBright,
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  payment.isFailed
                                      ? 'TRANSFER STATUS'
                                      : 'EXPECTED ARRIVAL',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        letterSpacing: 0.8,
                                        color: AppColors.muted,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Text(
                              payment.isFailed
                                  ? payment.status
                                  : DateFormat(
                                      'EEE, MMM d \'at\' h a',
                                    ).format(expected),
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 16),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                minHeight: 6,
                                value: progress,
                                backgroundColor: AppColors.border,
                                color: payment.isFailed
                                    ? AppColors.warning
                                    : AppColors.primaryBright,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              payment.isFailed
                                  ? 'Your transfer was not completed. Review the details and try again.'
                                  : payment.isSuccess
                                      ? 'Funds have been initiated and are moving to your bank.'
                                      : 'Transfer initiated',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(color: AppColors.muted),
                            ),
                            const SizedBox(height: 16),
                            _StatusDetailRow(
                              label: 'Amount',
                              value: NumberFormat.currency(
                                symbol: '\$',
                                decimalDigits: 2,
                              ).format(payment.amount),
                            ),
                            _StatusDetailRow(
                              label: 'Transfer ID',
                              value: payment.id,
                            ),
                            _StatusDetailRow(
                              label: 'Order',
                              value: payment.orderId.isEmpty
                                  ? 'Pending'
                                  : payment.orderId,
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      if (payment.isPending) ...[
                        OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _paymentStatusFuture = context
                                  .read<PaymentProvider>()
                                  .getPaymentStatus(widget.paymentId);
                            });
                          },
                          child: const Text('Refresh status'),
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextButton(
                        onPressed: () => context.go('/dashboard'),
                        child: const Text('Back to Dashboard'),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _StatusDetailRow extends StatelessWidget {
  const _StatusDetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
