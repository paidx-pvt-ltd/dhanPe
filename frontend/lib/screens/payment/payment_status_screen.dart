import 'dart:async';
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
  Transaction? _transaction;
  bool _isLoading = false;
  String? _error;
  Timer? _pollingTimer;
  final _transactionService = getIt<TransactionService>();

  @override
  void initState() {
    super.initState();
    _fetchTransaction();
  }

  Future<void> _fetchTransaction() async {
    if (!mounted) return;
    
    setState(() {
      _isLoading = _transaction == null;
      _error = null;
    });

    try {
      final data = await _transactionService.getTransaction(widget.paymentId);
      if (mounted) {
        setState(() {
          _transaction = data;
          _isLoading = false;
        });
        _startPollingIfRequired();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load transaction details: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _startPollingIfRequired() {
    _pollingTimer?.cancel();
    if (_transaction == null) return;

    // Terminal states for DhanPe lifecycle
    final terminalStates = {'COMPLETED', 'PAYMENT_FAILED', 'PAYOUT_FAILED', 'REFUNDED'};
    if (terminalStates.contains(_transaction!.lifecycleState)) return;

    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      try {
        final data = await _transactionService.getTransaction(widget.paymentId);
        if (mounted) {
          setState(() => _transaction = data);
          if (terminalStates.contains(data.lifecycleState)) {
            timer.cancel();
          }
        }
      } catch (_) {
        // Silently fail polling
      }
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
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
          if (_isLoading)
            Container(
              height: 320,
              decoration: AppTheme.panel(color: AppColors.surfaceLow),
              child: const Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _transaction == null)
            KineticPanel(
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
                    _error!,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 12),
                  GradientButton(
                    label: 'Try again',
                    onPressed: _fetchTransaction,
                  ),
                ],
              ),
            )
          else if (_transaction != null)
            Column(
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
                            label: _transaction!.status,
                            color: _transaction!.isFailed
                                ? AppColors.warning
                                : _transaction!.isCompleted
                                    ? AppColors.success
                                    : AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: _transaction!.payoutStatus,
                            color: AppColors.secondary,
                          ),
                          if (_pollingTimer?.isActive == true) ...[
                            const Spacer(),
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(_transaction!.amount),
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _transaction!.title,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Created ${DateFormat('MMM d, yyyy | h:mm a').format(_transaction!.createdAt)}',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _FlowTimeline(transaction: _transaction!),
                const SizedBox(height: 16),
                KineticPanel(
                  color: AppColors.surfaceHigh,
                  child: Column(
                    children: [
                      _DetailRow(label: 'Order ID', value: _transaction!.orderId),
                      _DetailRow(label: 'Gateway', value: _transaction!.paymentProvider),
                      _DetailRow(label: 'Lifecycle', value: _transaction!.lifecycleState),
                      _DetailRow(
                        label: 'Net settlement',
                        value: NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(_transaction!.netPayoutAmount),
                      ),
                      _DetailRow(
                        label: 'Platform fee',
                        value: NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                            .format(_transaction!.platformFeeAmount),
                      ),
                      if (_transaction!.beneficiary != null)
                        _DetailRow(
                          label: 'Linked account',
                          value:
                              '${_transaction!.beneficiary!.title} | ${_transaction!.beneficiary!.accountNumberMask}',
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (_transaction!.payout != null) ...[
                  KineticPanel(
                    color: AppColors.surfaceLow,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Settlement details', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text(
                          _transaction!.payout!.providerStatus ?? _transaction!.payout!.status,
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(color: AppColors.textMuted),
                        ),
                        if (_transaction!.payout!.failureReason != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _transaction!.payout!.failureReason!,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: AppColors.warning),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                if (_transaction!.refunds.isNotEmpty) ...[
                  KineticPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Refund updates', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 10),
                        ..._transaction!.refunds.map(
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
                  const SizedBox(height: 16),
                ],
                KineticPanel(
                  color: AppColors.surfaceLow,
                  child: Text(
                    'This operation is a bill payment settlement. Funds are processed via standard banking rails.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ),
                if (_transaction!.isCompleted && _transaction!.refunds.isEmpty) ...[
                  const SizedBox(height: 24),
                  Consumer<PaymentProvider>(
                    builder: (context, paymentProvider, _) {
                      return GradientButton(
                        label: 'Request full refund',
                        icon: Icons.keyboard_return_rounded,
                        isLoading: paymentProvider.isLoading,
                        onPressed: () => _requestRefund(_transaction!),
                      );
                    },
                  ),
                ],
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _requestRefund(Transaction transaction) async {
    final paymentProvider = context.read<PaymentProvider>();
    await paymentProvider.createRefund(
      transactionId: transaction.id,
      amount: transaction.amount,
      reason: 'Requested from mobile app status screen',
    );

    if (!mounted) return;

    if (paymentProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(paymentProvider.error!)),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Refund requested successfully.')),
    );
    _fetchTransaction();
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
      'Payment recorded',
      'Verification checks',
      'Banking settlement',
      'Operation complete',
    ];
    final currentIndex = states.indexOf(transaction.lifecycleState);

    return KineticPanel(
      color: AppColors.surfaceLow,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Transaction lifecycle', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          for (var i = 0; i < labels.length; i++) ...[
            Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 400),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i <= currentIndex ? AppColors.success : AppColors.surfaceHighest,
                    border: Border.all(
                      color: i <= currentIndex ? AppColors.success : AppColors.outline,
                      width: 1,
                    ),
                  ),
                  child: i <= currentIndex
                      ? const Icon(Icons.check, size: 12, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    labels[i],
                    style: TextStyle(
                      color: i <= currentIndex ? AppColors.text : AppColors.textMuted,
                      fontWeight: i == currentIndex ? FontWeight.w700 : FontWeight.w400,
                    ),
                  ),
                ),
              ],
            ),
            if (i < labels.length - 1)
              Padding(
                padding: const EdgeInsets.only(left: 9),
                child: Container(
                  width: 1,
                  height: 12,
                  color: i < currentIndex ? AppColors.success : AppColors.outline,
                ),
              ),
          ],
          const SizedBox(height: 16),
          Text(
            _edgeCaseHint(transaction),
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textMuted, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }

  String _edgeCaseHint(Transaction transaction) {
    if (transaction.lifecycleState == 'PAYMENT_FAILED') {
      return 'Payment verification failed at source.';
    }
    if (transaction.lifecycleState == 'PAYOUT_FAILED') {
      return 'Banking settlement issue detected. Support is reviewing.';
    }
    if (transaction.lifecycleState == 'REFUNDED') {
      return 'This transaction has been fully refunded.';
    }
    return 'Settlements typically reach bank accounts within T+1 working days.';
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
      padding: const EdgeInsets.symmetric(vertical: 6),
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
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
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
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
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
