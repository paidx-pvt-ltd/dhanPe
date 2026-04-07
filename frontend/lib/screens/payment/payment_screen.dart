import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/payment_provider.dart';
import '../../providers/user_provider.dart';

enum _TransferStep { setup, cardVerification, identityCheck, review }

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final NumberFormat _currencyFormat = NumberFormat.currency(
    symbol: '\$',
    decimalDigits: 2,
  );
  final List<_FundingSource> _cards = const [
    _FundingSource(
      label: 'Chase Sapphire **** 4209',
      subtitle: 'Preferred for rewards',
      icon: Icons.credit_card_rounded,
      tint: Color(0xFFE8F0FF),
      iconColor: Color(0xFF3268D8),
    ),
    _FundingSource(
      label: 'Amex Gold **** 1024',
      subtitle: 'Fastest verification',
      icon: Icons.credit_score_rounded,
      tint: Color(0xFFF8EFE3),
      iconColor: AppColors.warning,
    ),
  ];
  final List<_DestinationAccount> _banks = const [
    _DestinationAccount(
      label: 'Wells Fargo Checking',
      subtitle: 'Available in 1-2 business days',
      icon: Icons.account_balance_rounded,
      tint: Color(0xFFE7F4EE),
      iconColor: AppColors.accent,
      accountHolderName: 'Alex Mercer',
      accountNumber: '912345678910',
      ifsc: 'HDFC0001234',
      bankName: 'Wells Fargo Checking',
    ),
    _DestinationAccount(
      label: 'Chase Bank **** 4092',
      subtitle: 'Used for your last transfer',
      icon: Icons.savings_rounded,
      tint: Color(0xFFDDF0F7),
      iconColor: AppColors.primary,
      accountHolderName: 'Alex Mercer',
      accountNumber: '998877665544',
      ifsc: 'ICIC0004321',
      bankName: 'Chase Bank',
    ),
  ];

  _TransferStep _step = _TransferStep.setup;
  _FundingSource _selectedCard = const _FundingSource(
    label: 'Chase Sapphire **** 4209',
    subtitle: 'Preferred for rewards',
    icon: Icons.credit_card_rounded,
    tint: Color(0xFFE8F0FF),
    iconColor: Color(0xFF3268D8),
  );
  _DestinationAccount _selectedBank = const _DestinationAccount(
    label: 'Wells Fargo Checking',
    subtitle: 'Available in 1-2 business days',
    icon: Icons.account_balance_rounded,
    tint: Color(0xFFE7F4EE),
    iconColor: AppColors.accent,
    accountHolderName: 'Alex Mercer',
    accountNumber: '912345678910',
    ifsc: 'HDFC0001234',
    bankName: 'Wells Fargo Checking',
  );

  String _amountInput = '1250';
  bool _processingCard = false;
  bool _processingId = false;
  bool _isSubmitting = false;
  String? _amountError;
  double _dragProgress = 0;

  double get _amount =>
      double.tryParse(_amountInput.isEmpty ? '0' : _amountInput) ?? 0;
  double get _fee => _amount * 0.015;
  double get _total => _amount + _fee;
  bool get _canContinueFromSetup => _amount > 0 && _amount <= 5000;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = context.read<UserProvider>().user;
    if (user != null && user.firstName != null && user.lastName != null) {
      final accountHolder = '${user.firstName} ${user.lastName}'.trim();
      if (accountHolder.trim().isNotEmpty) {
        _selectedBank = _selectedBank.copyWith(
          accountHolderName: accountHolder,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 260),
          child: _buildStep(context),
        ),
      ),
    );
  }

  Widget _buildStep(BuildContext context) {
    switch (_step) {
      case _TransferStep.setup:
        return _buildTransferSetup(context);
      case _TransferStep.cardVerification:
        return _buildCardVerification(context);
      case _TransferStep.identityCheck:
        return _buildIdentityCheck(context);
      case _TransferStep.review:
        return _buildReview(context);
    }
  }

  Widget _buildTransferSetup(BuildContext context) {
    final feeText = _currencyFormat.format(_fee);
    return ListView(
      key: const ValueKey('setup'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      children: [
        _TopBar(
          title: 'Transfer Setup',
          leading: Icons.close_rounded,
          onLeadingTap: () => context.pop(),
        ),
        const SizedBox(height: 26),
        Text(
          _currencyFormat.format(_amount),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color:
                    _amountError == null ? AppColors.text : AppColors.warning,
              ),
        ),
        if (_amountError != null) ...[
          const SizedBox(height: 8),
          Text(
            _amountError!,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.warning),
          ),
        ],
        const SizedBox(height: 22),
        _InfoBanner(
          text: 'Includes 1.5% processing fee ($feeText). No hidden surprises.',
        ),
        const SizedBox(height: 22),
        _SelectorTile(
          label: 'From',
          value: _selectedCard.label,
          icon: _selectedCard.icon,
          tint: _selectedCard.tint,
          iconColor: _selectedCard.iconColor,
          onTap: () => _showSourcePicker(context),
        ),
        const SizedBox(height: 14),
        _SelectorTile(
          label: 'To',
          value: _selectedBank.label,
          icon: _selectedBank.icon,
          tint: _selectedBank.tint,
          iconColor: _selectedBank.iconColor,
          onTap: () => _showDestinationPicker(context),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppTheme.cardRadius),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Transfer details',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Text(
                'Account holder: ${_selectedBank.accountHolderName}\n'
                'Account: ${_maskedAccount(_selectedBank.accountNumber)}\n'
                'Routing: ${_selectedBank.ifsc}',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _NumericKeypad(onKeyTap: _onKeyTap),
        const SizedBox(height: 18),
        ElevatedButton(
          onPressed: _canContinueFromSetup ? _goToCardVerification : null,
          child: const Text('Review Transfer'),
        ),
      ],
    );
  }

  Widget _buildCardVerification(BuildContext context) {
    return Column(
      key: const ValueKey('card'),
      children: [
        _TopBar(
          title: 'Card Verification',
          leading: Icons.arrow_back_ios_new_rounded,
          onLeadingTap: () => setState(() => _step = _TransferStep.setup),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Expanded(
                  flex: 6,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(36),
                          gradient: const LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0xFF36555D), Color(0xFF24363B)],
                          ),
                        ),
                      ),
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          width: 250,
                          height: 150,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: Colors.white70, width: 2),
                          ),
                        ),
                      ),
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          width: 120,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.42),
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                      ),
                      if (_processingCard)
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(36),
                          ),
                          child: const Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Expanded(
                  flex: 4,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: AppTheme.softShadow(),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cover the middle numbers',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'We only need the last four digits and your name. Keeping the center digits covered adds a layer of safety.',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: AppColors.muted),
                        ),
                        const Spacer(),
                        Center(
                          child: GestureDetector(
                            onTap: _processingCard ? null : _captureCard,
                            child: Container(
                              width: 86,
                              height: 86,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.primary,
                                  width: 3,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Container(
                                width: 64,
                                height: 64,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIdentityCheck(BuildContext context) {
    final steps = [true, _processingId, false];
    return Padding(
      key: const ValueKey('identity'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TopBar(
            title: 'Identity Check',
            leading: Icons.arrow_back_ios_new_rounded,
            onLeadingTap: () =>
                setState(() => _step = _TransferStep.cardVerification),
          ),
          const SizedBox(height: 26),
          Row(
            children: List.generate(3, (index) {
              final active = steps[index];
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: index == 2 ? 0 : 6),
                  decoration: BoxDecoration(
                    color: active ? AppColors.primary : AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 28),
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(30),
                boxShadow: AppTheme.softShadow(),
              ),
              child: Column(
                children: [
                  Container(
                    width: 160,
                    height: 160,
                    decoration: const BoxDecoration(
                      color: AppColors.accentSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.verified_user_outlined,
                      size: 84,
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    _processingId
                        ? 'Checking your ID'
                        : 'A quick identity check',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'We only use this to verify it'
                    's really you. Bank-level encryption is applied end to end.',
                    style: Theme.of(
                      context,
                    ).textTheme.bodyLarge?.copyWith(color: AppColors.muted),
                    textAlign: TextAlign.center,
                  ),
                  const Spacer(),
                  if (_processingId)
                    const Column(
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          color: AppColors.accent,
                          size: 56,
                        ),
                        SizedBox(height: 12),
                        Text('Looks good. Taking you to review...'),
                      ],
                    )
                  else
                    ElevatedButton(
                      onPressed: _startIdScan,
                      child: const Text('Scan my ID'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReview(BuildContext context) {
    final expectedDate = DateTime.now().add(const Duration(days: 2));
    return Padding(
      key: const ValueKey('review'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: Column(
        children: [
          _TopBar(
            title: 'Review Details',
            leading: Icons.arrow_back_ios_new_rounded,
            onLeadingTap: () =>
                setState(() => _step = _TransferStep.identityCheck),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: AppTheme.softShadow(),
                  ),
                  child: Column(
                    children: [
                      _ReceiptRow(
                        label: 'Transfer Amount',
                        value: _currencyFormat.format(_amount),
                      ),
                      const SizedBox(height: 14),
                      _ReceiptRow(
                        label: 'Processing Fee (1.5%)',
                        value: _currencyFormat.format(_fee),
                      ),
                      const SizedBox(height: 16),
                      const Divider(
                        color: AppColors.border,
                        thickness: 1,
                        height: 1,
                      ),
                      const SizedBox(height: 16),
                      _ReceiptRow(
                        label: 'Total Billed',
                        value: _currencyFormat.format(_total),
                        emphasize: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  'Expected Timeline',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 14),
                const _TimelineStep(
                  icon: Icons.check_rounded,
                  active: true,
                  title: 'Today: Charged to card',
                  subtitle: 'Funds secured from ending in 4209',
                ),
                const _TimelineStep(
                  icon: Icons.more_horiz_rounded,
                  active: false,
                  title: 'Tomorrow: Processing',
                  subtitle: 'Network verification',
                ),
                _TimelineStep(
                  icon: Icons.account_balance_wallet_outlined,
                  active: false,
                  title:
                      '${DateFormat('EEE, MMM d').format(expectedDate)}: In your bank',
                  subtitle: 'Available in ${_selectedBank.label}',
                ),
                const SizedBox(height: 24),
                _SwipeToConfirm(
                  amountLabel: _currencyFormat.format(_total),
                  loading: _isSubmitting,
                  progress: _dragProgress,
                  onChanged: (value) => setState(() => _dragProgress = value),
                  onCompleted: _submitTransfer,
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.lock_outline_rounded,
                      size: 16,
                      color: AppColors.muted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Bank-level encryption applied',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _goToCardVerification() {
    if (_amount > 5000) {
      setState(() {
        _amountError =
            'For now, transfers are capped at ${_currencyFormat.format(5000)}.';
      });
      return;
    }

    setState(() {
      _amountError = null;
      _step = _TransferStep.cardVerification;
    });
  }

  void _onKeyTap(String value) {
    setState(() {
      if (value == 'backspace') {
        if (_amountInput.isNotEmpty) {
          _amountInput = _amountInput.substring(0, _amountInput.length - 1);
        }
      } else if (value == '.') {
        if (!_amountInput.contains('.')) {
          _amountInput = _amountInput.isEmpty ? '0.' : '$_amountInput.';
        }
      } else {
        if (_amountInput == '0') {
          _amountInput = value;
        } else {
          _amountInput += value;
        }
      }

      if (_amountInput.isEmpty) {
        _amountInput = '0';
      }

      final dotIndex = _amountInput.indexOf('.');
      if (dotIndex != -1 && _amountInput.length - dotIndex > 3) {
        _amountInput = _amountInput.substring(0, dotIndex + 3);
      }

      _amountError = _amount > 5000
          ? 'That'
              's above today'
              's friendly limit of ${_currencyFormat.format(5000)}.'
          : null;
    });
  }

  Future<void> _captureCard() async {
    setState(() => _processingCard = true);
    HapticFeedback.selectionClick();
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }
    setState(() {
      _processingCard = false;
      _step = _TransferStep.identityCheck;
    });
  }

  Future<void> _startIdScan() async {
    setState(() => _processingId = true);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }

    final completed = await context.read<UserProvider>().verifyIdentity();
    if (!mounted) {
      return;
    }

    if (!completed) {
      setState(() => _processingId = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<UserProvider>().error ?? 'Identity check could not be completed.',
          ),
        ),
      );
      return;
    }

    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (!mounted) {
      return;
    }

    setState(() {
      _processingId = false;
      _step = _TransferStep.review;
    });
  }

  Future<void> _submitTransfer() async {
    if (_isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    final paymentProvider = context.read<PaymentProvider>();
    await paymentProvider.createPayment(
      amount: _amount,
      accountHolderName: _selectedBank.accountHolderName,
      accountNumber: _selectedBank.accountNumber,
      ifsc: _selectedBank.ifsc,
      bankName: _selectedBank.bankName,
      description: 'Friendly transfer from ${_selectedCard.label}',
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _isSubmitting = false;
      _dragProgress = 0;
    });

    if (paymentProvider.currentPayment != null) {
      context.go('/payment-status/${paymentProvider.currentPayment!.id}');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(paymentProvider.error ?? 'Failed to create transfer'),
      ),
    );
  }

  Future<void> _showSourcePicker(BuildContext context) async {
    final card = await showModalBottomSheet<_FundingSource>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => _PickerSheet<_FundingSource>(
        title: 'Choose a card',
        items: _cards,
        selected: _selectedCard,
        labelBuilder: (item) => item.label,
        subtitleBuilder: (item) => item.subtitle,
        iconBuilder: (item) => item.icon,
        tintBuilder: (item) => item.tint,
        iconColorBuilder: (item) => item.iconColor,
      ),
    );

    if (card != null) {
      setState(() => _selectedCard = card);
    }
  }

  Future<void> _showDestinationPicker(BuildContext context) async {
    final bank = await showModalBottomSheet<_DestinationAccount>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => _PickerSheet<_DestinationAccount>(
        title: 'Choose a bank',
        items: _banks,
        selected: _selectedBank,
        labelBuilder: (item) => item.label,
        subtitleBuilder: (item) => item.subtitle,
        iconBuilder: (item) => item.icon,
        tintBuilder: (item) => item.tint,
        iconColorBuilder: (item) => item.iconColor,
      ),
    );

    if (bank != null) {
      setState(() => _selectedBank = bank);
    }
  }

  String _maskedAccount(String accountNumber) {
    if (accountNumber.length < 4) {
      return accountNumber;
    }
    return '**** ${accountNumber.substring(accountNumber.length - 4)}';
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.title,
    required this.leading,
    required this.onLeadingTap,
  });

  final String title;
  final IconData leading;
  final VoidCallback onLeadingTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        InkWell(
          onTap: onLeadingTap,
          borderRadius: BorderRadius.circular(999),
          child: Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
            ),
            child: Icon(leading, color: AppColors.text),
          ),
        ),
        Expanded(
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        const SizedBox(width: 44),
      ],
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_rounded, color: Color(0xFF547450)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF547450),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectorTile extends StatelessWidget {
  const _SelectorTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.tint,
    required this.iconColor,
    required this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color tint;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppTheme.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.cardRadius),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.cardRadius),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
                child: Icon(icon, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label.toUpperCase(),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Text(value, style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _NumericKeypad extends StatelessWidget {
  const _NumericKeypad({required this.onKeyTap});

  final ValueChanged<String> onKeyTap;

  @override
  Widget build(BuildContext context) {
    final keys = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '.',
      '0',
      'backspace',
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: keys.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.5,
      ),
      itemBuilder: (context, index) {
        final key = keys[index];
        return InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => onKeyTap(key),
          child: Center(
            child: key == 'backspace'
                ? const Icon(Icons.backspace_outlined, size: 24)
                : Text(
                    key,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontFamily: 'sans-serif',
                          fontWeight: FontWeight.w700,
                        ),
                  ),
          ),
        );
      },
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  const _ReceiptRow({
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final textStyle = emphasize
        ? Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)
        : Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700);
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: emphasize ? AppColors.text : AppColors.muted,
                ),
          ),
        ),
        Text(value, style: textStyle),
      ],
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.icon,
    required this.active,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final bool active;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 4),
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: active ? AppColors.accent : Colors.transparent,
              border: Border.all(
                color: active ? AppColors.accent : AppColors.border,
                width: 2,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 16,
              color: active ? Colors.white : AppColors.muted,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SwipeToConfirm extends StatelessWidget {
  const _SwipeToConfirm({
    required this.amountLabel,
    required this.loading,
    required this.progress,
    required this.onChanged,
    required this.onCompleted,
  });

  final String amountLabel;
  final bool loading;
  final double progress;
  final ValueChanged<double> onChanged;
  final Future<void> Function() onCompleted;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        const thumbSize = 56.0;
        final travel = math.max(maxWidth - thumbSize - 12, 0.0);

        return Container(
          height: 72,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(999),
            boxShadow: AppTheme.softShadow(),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 84),
                  child: Center(
                    child: Text(
                      loading
                          ? 'Sending transfer...'
                          : 'Swipe to move $amountLabel',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.primary,
                          ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 8 + travel * progress,
                top: 8,
                child: GestureDetector(
                  onHorizontalDragUpdate: loading
                      ? null
                      : (details) {
                          final next = (progress + (details.delta.dx / travel))
                              .clamp(0.0, 1.0);
                          onChanged(next);
                        },
                  onHorizontalDragEnd: loading
                      ? null
                      : (_) async {
                          if (progress > 0.88) {
                            HapticFeedback.mediumImpact();
                            onChanged(1);
                            await onCompleted();
                          } else {
                            onChanged(0);
                          }
                        },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 120),
                    width: thumbSize,
                    height: thumbSize,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                          ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PickerSheet<T> extends StatelessWidget {
  const _PickerSheet({
    required this.title,
    required this.items,
    required this.selected,
    required this.labelBuilder,
    required this.subtitleBuilder,
    required this.iconBuilder,
    required this.tintBuilder,
    required this.iconColorBuilder,
  });

  final String title;
  final List<T> items;
  final T selected;
  final String Function(T item) labelBuilder;
  final String Function(T item) subtitleBuilder;
  final IconData Function(T item) iconBuilder;
  final Color Function(T item) tintBuilder;
  final Color Function(T item) iconColorBuilder;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            ...items.map((item) {
              final isSelected = item == selected;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Material(
                  color:
                      isSelected ? AppColors.accentSoft : AppColors.background,
                  borderRadius: BorderRadius.circular(22),
                  child: ListTile(
                    onTap: () => Navigator.of(context).pop(item),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(22),
                    ),
                    leading: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: tintBuilder(item),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        iconBuilder(item),
                        color: iconColorBuilder(item),
                      ),
                    ),
                    title: Text(labelBuilder(item)),
                    subtitle: Text(subtitleBuilder(item)),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.accent,
                          )
                        : const Icon(Icons.chevron_right_rounded),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _FundingSource {
  const _FundingSource({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.tint,
    required this.iconColor,
  });

  final String label;
  final String subtitle;
  final IconData icon;
  final Color tint;
  final Color iconColor;
}

class _DestinationAccount {
  const _DestinationAccount({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.tint,
    required this.iconColor,
    required this.accountHolderName,
    required this.accountNumber,
    required this.ifsc,
    required this.bankName,
  });

  final String label;
  final String subtitle;
  final IconData icon;
  final Color tint;
  final Color iconColor;
  final String accountHolderName;
  final String accountNumber;
  final String ifsc;
  final String bankName;

  _DestinationAccount copyWith({String? accountHolderName}) {
    return _DestinationAccount(
      label: label,
      subtitle: subtitle,
      icon: icon,
      tint: tint,
      iconColor: iconColor,
      accountHolderName: accountHolderName ?? this.accountHolderName,
      accountNumber: accountNumber,
      ifsc: ifsc,
      bankName: bankName,
    );
  }
}
