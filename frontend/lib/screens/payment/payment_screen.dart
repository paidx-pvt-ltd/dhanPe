import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../config/config.dart';
import '../../core/app_theme.dart';
import '../../models/beneficiary.dart';
import '../../providers/beneficiary_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _searchController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _accountHolderController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _ifscController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _labelController = TextEditingController();
  final _currency = NumberFormat.currency(symbol: 'INR ', decimalDigits: 2);

  Beneficiary? _selectedBeneficiary;
  String _query = '';
  bool _useManualForm = false;
  bool _acceptedDisclosure = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<UserProvider>().loadProfile();
      context.read<BeneficiaryProvider>().loadBeneficiaries();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    _accountHolderController.dispose();
    _accountNumberController.dispose();
    _ifscController.dispose();
    _bankNameController.dispose();
    _labelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer3<UserProvider, BeneficiaryProvider, PaymentProvider>(
      builder: (context, userProvider, beneficiaryProvider, paymentProvider, _) {
        final filteredBeneficiaries = beneficiaryProvider.beneficiaries.where((item) {
          if (_query.isEmpty) {
            return true;
          }
          final haystack =
              '${item.label} ${item.accountHolderName} ${item.accountNumberMask} ${item.ifsc}'
                  .toLowerCase();
          return haystack.contains(_query.toLowerCase());
        }).toList();
        final user = userProvider.user;
        final canTransfer = user?.isKycApproved == true && _hasCompleteProfile(user);

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
          children: [
            const SectionHeading(
              title: 'Payments',
              subtitle: 'Pay bills and manage settlement accounts',
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value),
              decoration: const InputDecoration(
                hintText: 'Search beneficiary or bank',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
            const SizedBox(height: 22),
            if (!canTransfer)
              KineticPanel(
                glass: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, color: AppColors.warning),
                        const SizedBox(width: 10),
                        Text('Urgent attention', style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.isKycApproved == true
                          ? 'Finish your compliance profile before creating a bill payment.'
                          : 'Complete KYC and your profile details before creating a bill payment.',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Go to profile',
                      icon: Icons.arrow_forward_rounded,
                      onPressed: () => context.go('/profile'),
                    ),
                  ],
                ),
              )
            else
              KineticPanel(
                glass: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Create bill payment',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                        Switch.adaptive(
                          value: _useManualForm,
                          activeTrackColor: AppColors.secondary.withValues(alpha: 0.5),
                          activeThumbColor: AppColors.secondary,
                          onChanged: (value) {
                            setState(() {
                              _useManualForm = value;
                              if (value) {
                                _selectedBeneficiary = null;
                              }
                            });
                          },
                        ),
                      ],
                    ),
                    Text(
                      _useManualForm
                          ? 'Use one-off bank details'
                          : 'Pick a saved account to settle payment proceeds',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textMuted),
                    ),
                    if (user?.panVerified != true) ...[
                      const SizedBox(height: 8),
                      Text(
                        'PAN will be requested before the first transfer is submitted.',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: AppColors.warning),
                      ),
                    ],
                    const SizedBox(height: 18),
                    TextField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        prefixIcon: Icon(Icons.currency_rupee_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        prefixIcon: Icon(Icons.notes_rounded),
                      ),
                    ),
                    const SizedBox(height: 18),
                    if (_useManualForm) ...[
                      TextField(
                        controller: _labelController,
                        decoration: const InputDecoration(
                          labelText: 'Beneficiary label',
                          prefixIcon: Icon(Icons.bookmark_outline_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _accountHolderController,
                        decoration: const InputDecoration(
                          labelText: 'Account holder name',
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _accountNumberController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Account number',
                          prefixIcon: Icon(Icons.account_balance_wallet_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _ifscController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'IFSC',
                          prefixIcon: Icon(Icons.numbers_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _bankNameController,
                        decoration: const InputDecoration(
                          labelText: 'Bank name',
                          prefixIcon: Icon(Icons.account_balance_rounded),
                        ),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: beneficiaryProvider.isLoading ? null : _saveBeneficiary,
                        child: const Text('Save beneficiary first'),
                      ),
                    ] else ...[
                      if (_selectedBeneficiary != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _BeneficiaryRow(
                            beneficiary: _selectedBeneficiary!,
                            selected: true,
                            onTap: () {},
                          ),
                        ),
                    ],
                    const SizedBox(height: 6),
                    _ComplianceDisclosureTile(
                      accepted: _acceptedDisclosure,
                      onChanged: (value) {
                        setState(() => _acceptedDisclosure = value ?? false);
                      },
                    ),
                    const SizedBox(height: 10),
                    GradientButton(
                      label: 'Continue to checkout',
                      icon: Icons.arrow_outward_rounded,
                      isLoading: paymentProvider.isLoading,
                      onPressed:
                          canTransfer && _acceptedDisclosure ? _createTransfer : null,
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: KineticPanel(
                    color: AppColors.surfaceHigh,
                    child: _QuickAmountChip(
                      title: 'Rent',
                      subtitle: _currency.format(12000),
                      onTap: () => _amountController.text = '12000',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: KineticPanel(
                    color: AppColors.surfaceLow,
                    child: _QuickAmountChip(
                      title: 'School',
                      subtitle: _currency.format(5000),
                      onTap: () => _amountController.text = '5000',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SectionHeading(
              title: 'Linked settlement accounts',
              subtitle: beneficiaryProvider.error,
              actionLabel: _useManualForm ? null : 'Manual',
              onActionTap: () => setState(() => _useManualForm = true),
            ),
            const SizedBox(height: 12),
            if (beneficiaryProvider.isLoading && beneficiaryProvider.beneficiaries.isEmpty)
              const _PaymentLoadingList()
            else if (filteredBeneficiaries.isEmpty)
              KineticPanel(
                color: AppColors.surfaceLow,
                child: Text(
                  _query.isEmpty
                      ? 'No beneficiaries saved yet.'
                      : 'No beneficiaries match your search.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              )
            else
              ...filteredBeneficiaries.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _BeneficiaryRow(
                    beneficiary: item,
                    selected: _selectedBeneficiary?.id == item.id,
                    onTap: () {
                      setState(() {
                        _useManualForm = false;
                        _selectedBeneficiary = item;
                      });
                    },
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  bool _hasCompleteProfile(user) {
    if (user == null) {
      return false;
    }

    return [
      user.firstName,
      user.lastName,
      user.phoneNumber,
      user.addressLine1,
      user.city,
      user.state,
      user.postalCode,
    ].every((value) => value != null && value.toString().trim().isNotEmpty);
  }

  Future<void> _saveBeneficiary() async {
    if (_accountHolderController.text.trim().isEmpty ||
        _accountNumberController.text.trim().isEmpty ||
        _ifscController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fill account holder, account number, and IFSC first')),
      );
      return;
    }

    final provider = context.read<BeneficiaryProvider>();
    final beneficiary = await provider.createBeneficiary(
      accountHolderName: _accountHolderController.text.trim(),
      accountNumber: _accountNumberController.text.trim(),
      ifsc: _ifscController.text.trim().toUpperCase(),
      bankName: _bankNameController.text.trim().isEmpty ? null : _bankNameController.text.trim(),
      label: _labelController.text.trim().isEmpty ? null : _labelController.text.trim(),
    );

    if (!mounted) {
      return;
    }

    if (beneficiary == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Could not save settlement account')),
      );
      return;
    }

    setState(() {
      _selectedBeneficiary = beneficiary;
      _useManualForm = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Saved ${beneficiary.label}')),
    );
  }

  Future<void> _createTransfer() async {
    final amountText = _amountController.text.trim();
    final amount = double.tryParse(amountText);
    
    if (amount == null || amount <= 0) {
      _showSnackBar('Enter a valid amount');
      return;
    }

    if (!_useManualForm && _selectedBeneficiary == null) {
      _showSnackBar('Select a beneficiary first');
      return;
    }

    if (_useManualForm && (_accountNumberController.text.isEmpty || _ifscController.text.isEmpty)) {
      _showSnackBar('Complete bank details first');
      return;
    }

    // 1. Detailed Confirmation Dialog (Fee breakdown + T+1)
    final fee = _estimateFee(amount);
    final total = amount + fee;
    
    final confirmed = await _showDetailedConfirmation(
      context,
      amount: amount,
      fee: fee,
      total: total,
      beneficiaryLabel: _useManualForm 
          ? _accountHolderController.text 
          : _selectedBeneficiary!.label,
    );

    if (!confirmed || !mounted) return;

    final paymentProvider = context.read<PaymentProvider>();
    await paymentProvider.createPayment(
      amount: amount,
      beneficiaryId: !_useManualForm ? _selectedBeneficiary?.id : null,
      accountHolderName: _useManualForm ? _accountHolderController.text.trim() : null,
      bankAccountRef: _useManualForm ? _accountNumberController.text.trim() : null,
      ifsc: _useManualForm ? _ifscController.text.trim().toUpperCase() : null,
      bankName: _useManualForm && _bankNameController.text.trim().isNotEmpty
          ? _bankNameController.text.trim()
          : null,
      description: _descriptionController.text.trim().isEmpty 
          ? null 
          : _descriptionController.text.trim(),
      useSandbox: Config.isCashfreeSandbox,
    );

    if (!mounted) return;

    if (paymentProvider.currentPayment == null &&
        paymentProvider.errorCode == 'PAN_REQUIRED') {
      final panVerified = await _promptForPan(context);
      if (!mounted || !panVerified) return;

      // Retry after PAN verification
      await paymentProvider.createPayment(
        amount: amount,
        beneficiaryId: !_useManualForm ? _selectedBeneficiary?.id : null,
        accountHolderName: _useManualForm ? _accountHolderController.text.trim() : null,
        bankAccountRef: _useManualForm ? _accountNumberController.text.trim() : null,
        ifsc: _useManualForm ? _ifscController.text.trim().toUpperCase() : null,
        bankName: _useManualForm && _bankNameController.text.trim().isNotEmpty
            ? _bankNameController.text.trim()
            : null,
        description: _descriptionController.text.trim().isEmpty 
            ? null 
            : _descriptionController.text.trim(),
        useSandbox: Config.isCashfreeSandbox,
      );
    }

    if (!mounted) return;

    if (paymentProvider.currentPayment == null) {
      _showSnackBar(paymentProvider.error ?? 'Payment creation failed');
      return;
    }

    await context.read<TransactionsProvider>().loadRecentTransactions();
    if (!mounted) return;
    context.push('/transfers/${paymentProvider.currentPayment!.id}');
  }

  double _estimateFee(double amount) {
    // Standard DhanPe convenience fee (Simulation: 1.5%)
    return (amount * 0.015);
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<bool> _promptForPan(BuildContext context) async {
    final panController = TextEditingController();
    final userProvider = context.read<UserProvider>();
    final legalNameController = TextEditingController(text: userProvider.user?.displayName ?? '');
    
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('PAN verification required'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Government regulations require a verified PAN before initiating your first transfer.'),
              const SizedBox(height: 16),
              TextField(
                controller: panController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'PAN Number', hintText: 'ABCDE1234F'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: legalNameController,
                decoration: const InputDecoration(labelText: 'Full Legal Name'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final ok = await userProvider.submitPan(
                  panNumber: panController.text.trim(),
                  legalName: legalNameController.text.trim(),
                );
                if (dialogContext.mounted) {
                  Navigator.of(dialogContext).pop(ok);
                }
              },
              child: const Text('Verify & Continue'),
            ),
          ],
        );
      },
    );

    panController.dispose();
    legalNameController.dispose();
    return result ?? false;
  }
}

class _QuickAmountChip extends StatelessWidget {
  const _QuickAmountChip({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 10),
          Text(subtitle, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            'Tap to fill',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.success),
          ),
        ],
      ),
    );
  }
}

class _BeneficiaryRow extends StatelessWidget {
  const _BeneficiaryRow({
    required this.beneficiary,
    required this.selected,
    required this.onTap,
  });

  final Beneficiary beneficiary;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppTheme.lgRadius),
      onTap: onTap,
      child: KineticPanel(
        color: selected ? AppColors.surfaceHighest : AppColors.surfaceHigh,
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.account_balance_rounded,
                color: beneficiary.isVerified ? AppColors.secondary : AppColors.warning,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Row(
                    children: [
                      Flexible(
                        child: Text(
                          beneficiary.label, 
                          style: Theme.of(context).textTheme.titleMedium,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (beneficiary.isVerified) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.verified_rounded, color: AppColors.secondary, size: 14),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${beneficiary.accountNumberMask} • ${beneficiary.ifsc}',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: AppColors.secondary)
            else
              StatusBadge(
                label: beneficiary.isVerified ? 'VERIFIED BANK' : 'PENDING',
                color: beneficiary.isVerified ? AppColors.success : AppColors.warning,
              ),
          ],
        ),
      ),
    );
  }
}

class _PaymentLoadingList extends StatelessWidget {
  const _PaymentLoadingList();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            height: 96,
            decoration: AppTheme.panel(color: AppColors.surfaceLow),
          ),
        ),
      ),
    );
  }
}

class _ComplianceDisclosureTile extends StatelessWidget {
  const _ComplianceDisclosureTile({
    required this.accepted,
    required this.onChanged,
  });

  final bool accepted;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    return KineticPanel(
      color: AppColors.surfaceLow,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Compliance Disclosure',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'DhanPe balances are settled as business utility payments. Estimated arrival: Next business day (T+1).',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 8),
          CheckboxListTile(
            value: accepted,
            dense: true,
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.secondary,
            title: const Text('I confirm this is for a valid business bill payment.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

Future<bool> _showDetailedConfirmation(
  BuildContext context, {
  required double amount,
  required double fee,
  required double total,
  required String beneficiaryLabel,
}) async {
  final currency = NumberFormat.currency(symbol: '₹ ', decimalDigits: 2);
  
  return await showDialog<bool>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: const Text('Review Bill Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            KineticPanel(
              color: AppColors.surfaceHighest,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _confirmRow('Settling to', beneficiaryLabel),
                  const Divider(height: 24),
                  _confirmRow('Payment Amount', currency.format(amount)),
                  _confirmRow('Convenience Fee', currency.format(fee)),
                  const Divider(height: 24),
                  _confirmRow('Total Payable', currency.format(total), isBold: true),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Icon(Icons.timer_outlined, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Express Settlement (T+1): Funds will reach the bank by next working day.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Go Back'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Proceed to Pay'),
          ),
        ],
      );
    },
  ) ?? false;
}

Widget _confirmRow(String label, String value, {bool isBold = false}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text(
          value, 
          style: TextStyle(
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            fontSize: isBold ? 15 : 13,
            color: isBold ? AppColors.primary : AppColors.text,
          )
        ),
      ],
    ),
  );
}
