import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
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
    // Delay the async call until after the build phase completes
    // This prevents setState() during build error
    _paymentStatusFuture = Future.delayed(Duration.zero, () {
      return context.read<PaymentProvider>().getPaymentStatus(
        widget.paymentId,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Payment Status'),
          centerTitle: true,
          automaticallyImplyLeading: false,
        ),
        body: FutureBuilder(
          future: _paymentStatusFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(),
              );
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
                        const Text('Payment not found'),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () => context.go('/dashboard'),
                          child: const Text('Go to Dashboard'),
                        ),
                      ],
                    ),
                  );
                }

                return SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const SizedBox(height: 32),
                        // Status Icon
                        if (payment.isSuccess)
                          Icon(
                            Icons.check_circle,
                            size: 80,
                            color: Colors.green[400],
                          )
                        else if (payment.isFailed)
                          Icon(
                            Icons.cancel,
                            size: 80,
                            color: Colors.red[400],
                          )
                        else
                          SizedBox(
                            width: 80,
                            height: 80,
                            child: CircularProgressIndicator(
                              strokeWidth: 4,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.blue[400]!,
                              ),
                            ),
                          ),
                        const SizedBox(height: 24),
                        // Status Text
                        Text(
                          payment.isSuccess
                              ? 'Payment Successful'
                              : payment.isFailed
                                  ? 'Payment Failed'
                                  : 'Processing Payment',
                          style:
                              Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: payment.isSuccess
                                        ? Colors.green
                                        : payment.isFailed
                                            ? Colors.red
                                            : Colors.blue,
                                  ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        // Payment Details Card
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              children: [
                                _DetailRow(
                                  label: 'Amount',
                                  value: '₹${payment.amount.toStringAsFixed(2)}',
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Status',
                                  value: payment.status,
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Payment ID',
                                  value: payment.id.substring(0, 8),
                                ),
                                const SizedBox(height: 12),
                                _DetailRow(
                                  label: 'Date',
                                  value:
                                      '${payment.createdAt.day}/${payment.createdAt.month}/${payment.createdAt.year}',
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                        // Actions
                        if (!payment.isSuccess && !payment.isFailed)
                          Column(
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  context
                                      .read<PaymentProvider>()
                                      .refreshPaymentStatus();
                                },
                                child: const Text('Refresh Status'),
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed: () => context.go('/dashboard'),
                                child: const Text('Go to Dashboard'),
                              ),
                            ],
                          )
                        else
                          ElevatedButton(
                            onPressed: () => context.go('/dashboard'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 48,
                                vertical: 12,
                              ),
                            ),
                            child: const Text('Done'),
                          ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
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
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style:
              Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }
}
