import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/payment_provider.dart';

class PaymentStatusScreen extends StatefulWidget {
  final String paymentId;

  const PaymentStatusScreen({
    super.key,
    required this.paymentId,
  });

  @override
  State<PaymentStatusScreen> createState() => _PaymentStatusScreenState();
}

class _PaymentStatusScreenState extends State<PaymentStatusScreen> {
  late Future<void> _paymentStatusFuture;

  @override
  void initState() {
    super.initState();
    _paymentStatusFuture = Future.delayed(Duration.zero, () {
      return context.read<PaymentProvider>().getPaymentStatus(widget.paymentId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: const Text('Transfer Status'),
          centerTitle: true,
        ),
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
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        const Text('Transfer not found'),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () => context.go('/dashboard'),
                          child: const Text('Go to dashboard'),
                        ),
                      ],
                    ),
                  );
                }

                return SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        Icon(
                          payment.isSuccess
                              ? Icons.check_circle
                              : payment.isFailed
                                  ? Icons.cancel
                                  : Icons.schedule,
                          size: 80,
                          color: payment.isSuccess
                              ? Colors.green
                              : payment.isFailed
                                  ? Colors.red
                                  : Colors.blue,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          payment.isSuccess
                              ? 'Transfer Successful'
                              : payment.isFailed
                                  ? 'Transfer Failed'
                                  : 'Transfer In Progress',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 28),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              children: [
                                _DetailRow(
                                  label: 'Amount',
                                  value: 'Rs ${payment.amount.toStringAsFixed(2)}',
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(label: 'Status', value: payment.status),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Transaction ID',
                                  value: payment.id,
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Order ID',
                                  value: payment.orderId.isEmpty
                                      ? 'Pending'
                                      : payment.orderId,
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Created',
                                  value:
                                      '${payment.createdAt.day}/${payment.createdAt.month}/${payment.createdAt.year}',
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        if (payment.isPending) ...[
                          ElevatedButton(
                            onPressed: () {
                              context.read<PaymentProvider>().refreshPaymentStatus();
                            },
                            child: const Text('Refresh status'),
                          ),
                          const SizedBox(height: 12),
                        ],
                        OutlinedButton(
                          onPressed: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go('/dashboard');
                            }
                          },
                          child: const Text('Back'),
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

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        const SizedBox(width: 16),
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
    );
  }
}
