import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/debug_status_banner.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final userProvider = context.read<UserProvider>();

      if (userProvider.user == null && authProvider.user != null) {
        userProvider.seedUser(authProvider.user!);
      }

      userProvider.loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final payment = context.watch<PaymentProvider>().currentPayment;

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFF8F3EC),
              AppColors.background,
              AppColors.background,
            ],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => context.read<UserProvider>().loadProfile(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                const DebugStatusBanner(),
                Consumer<UserProvider>(
                  builder: (context, userProvider, _) {
                    if (userProvider.isLoading) {
                      return const _DashboardLoading();
                    }

                    final user = userProvider.user;
                    final displayName =
                        user?.firstName?.trim().isNotEmpty == true
                        ? user!.firstName!.trim()
                        : 'there';

                    return _Header(
                      displayName: displayName,
                      onProfileTap: () => context.push('/profile'),
                      onLogoutTap: () => _showLogoutDialog(context),
                    );
                  },
                ),
                const SizedBox(height: 22),
                _HeroTransferCard(
                  payment: payment,
                  onStatusTap: payment == null
                      ? null
                      : () => context.push('/payment-status/${payment.id}'),
                ),
                const SizedBox(height: 28),
                _SectionHeader(
                  title: 'Recent Activity',
                  actionText: 'See all',
                  onTap: () => context.push('/transactions'),
                ),
                const SizedBox(height: 8),
                _ActivityCard(payment: payment),
                const SizedBox(height: 18),
                Consumer<UserProvider>(
                  builder: (context, userProvider, _) {
                    return _SupportCard(
                      balance: userProvider.balance,
                      kycStatus: userProvider.user?.kycStatus ?? 'PENDING',
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: SizedBox(
        width: MediaQuery.of(context).size.width - 40,
        child: ElevatedButton.icon(
          onPressed: () => context.push('/payment'),
          icon: const Icon(Icons.sync_alt_rounded, size: 20),
          label: const Text('Move Money'),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You can log back in any time.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Stay here'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              final userProvider = Provider.of<UserProvider>(context, listen: false);
              final paymentProvider = Provider.of<PaymentProvider>(context, listen: false);
              await context.read<AuthProvider>().logout();
              if (!context.mounted) {
                return;
              }
              userProvider.clearState();
              paymentProvider.clearCurrentPayment();
              if (!context.mounted) {
                return;
              }
              context.go('/login');
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.displayName,
    required this.onProfileTap,
    required this.onLogoutTap,
  });

  final String displayName;
  final VoidCallback onProfileTap;
  final VoidCallback onLogoutTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.surface,
            boxShadow: AppTheme.softShadow(),
          ),
          alignment: Alignment.center,
          child: const Text(
            'A',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _greeting(),
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: AppColors.muted),
              ),
              Text(
                displayName,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        _CircleIconButton(
          icon: Icons.person_outline_rounded,
          onTap: onProfileTap,
        ),
        const SizedBox(width: 10),
        _CircleIconButton(icon: Icons.logout_rounded, onTap: onLogoutTap),
      ],
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }
}

class _HeroTransferCard extends StatelessWidget {
  const _HeroTransferCard({required this.payment, this.onStatusTap});

  final dynamic payment;
  final VoidCallback? onStatusTap;

  @override
  Widget build(BuildContext context) {
    final hasPayment = payment != null;
    final amount = hasPayment ? payment.amount as double : 0.0;
    final dateLabel = hasPayment
        ? DateFormat(
            'EEEE',
          ).format((payment.createdAt as DateTime).add(const Duration(days: 1)))
        : 'your timeline';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.cardRadius),
        border: Border.all(color: AppColors.border),
        boxShadow: AppTheme.softShadow(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.lightBlue,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  hasPayment ? 'In Progress' : 'Ready to start',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.primaryBright,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  color: AppColors.lightBlue,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Icon(
                  hasPayment
                      ? Icons.account_balance_rounded
                      : Icons.currency_exchange_rounded,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            hasPayment ? 'Arriving $dateLabel' : 'Ready when you need it',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            hasPayment
                ? 'Transfer to your linked bank account'
                : 'Move funds from card to bank with clear fees and a calm, guided flow.',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 18),
          const Divider(height: 1),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasPayment ? 'Amount Moving' : 'Typical payout speed',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      hasPayment ? _currency(amount) : '1-2 business days',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: hasPayment
                    ? onStatusTap
                    : () => context.push('/payment'),
                child: Text(hasPayment ? 'View status ->' : 'Start now ->'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _currency(double amount) {
    return NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(amount);
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionText,
    required this.onTap,
  });

  final String title;
  final String actionText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        TextButton(onPressed: onTap, child: Text(actionText)),
      ],
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.payment});

  final dynamic payment;

  @override
  Widget build(BuildContext context) {
    final activities = [
      _ActivityItem(
        icon: Icons.check_circle_rounded,
        iconColor: AppColors.accent,
        title: payment != null ? 'Transfer created' : 'Ready to move money',
        subtitle: payment != null
            ? 'Most recent transfer in progress'
            : 'Tap Move Money to start',
        amount: payment != null
            ? '-${_currency(payment.amount as double)}'
            : null,
      ),
      const _ActivityItem(
        icon: Icons.account_balance_rounded,
        iconColor: AppColors.primary,
        title: 'Linked bank ready',
        subtitle: 'Wells Fargo Checking',
      ),
      const _ActivityItem(
        icon: Icons.credit_card_rounded,
        iconColor: AppColors.muted,
        title: 'Card secured',
        subtitle: 'Visa ending in 4242',
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.cardRadius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: List.generate(activities.length, (index) {
          final item = activities[index];
          return Column(
            children: [
              ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Icon(item.icon, color: item.iconColor, size: 22),
                ),
                title: Text(
                  item.title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                subtitle: Text(
                  item.subtitle,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
                ),
                trailing: item.amount == null
                    ? null
                    : Text(
                        item.amount!,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
              ),
              if (index < activities.length - 1)
                const Divider(indent: 76, endIndent: 16, height: 1),
            ],
          );
        }),
      ),
    );
  }

  String _currency(double amount) {
    return NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(amount);
  }
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({required this.balance, required this.kycStatus});

  final double balance;
  final String kycStatus;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceTint,
        borderRadius: BorderRadius.circular(AppTheme.cardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'A calmer way to borrow a little time',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 10),
          Text(
            'Available balance ${NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(balance)} | KYC $kycStatus',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 46,
          height: 46,
          child: Icon(icon, color: AppColors.text),
        ),
      ),
    );
  }
}

class _DashboardLoading extends StatelessWidget {
  const _DashboardLoading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: const BoxDecoration(
                color: AppColors.surfaceTint,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 14,
                    width: 110,
                    color: AppColors.surfaceTint,
                  ),
                  const SizedBox(height: 10),
                  Container(
                    height: 24,
                    width: 150,
                    color: AppColors.surfaceTint,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Container(
          height: 180,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppTheme.cardRadius),
          ),
        ),
      ],
    );
  }
}

class _ActivityItem {
  const _ActivityItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.amount,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String? amount;
}
