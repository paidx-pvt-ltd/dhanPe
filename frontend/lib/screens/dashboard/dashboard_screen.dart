import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../models/transaction.dart';
import '../../providers/beneficiary_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/debug_status_banner.dart';
import '../../widgets/kinetic_primitives.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _currency = NumberFormat.currency(symbol: 'INR ', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeData();
    });
  }

  Future<void> _initializeData() async {
    final userProvider = context.read<UserProvider>();
    final beneficiaryProvider = context.read<BeneficiaryProvider>();
    final transactionsProvider = context.read<TransactionsProvider>();

    await Future.wait([
      userProvider.loadProfile(),
      beneficiaryProvider.loadBeneficiaries(),
      transactionsProvider.loadRecentTransactions(),
    ]);

    if (mounted) {
      userProvider.setHasBeneficiaries(beneficiaryProvider.beneficiaries.isNotEmpty);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _initializeData,
      child: Consumer3<UserProvider, BeneficiaryProvider, TransactionsProvider>(
        builder: (context, userProvider, beneficiaryProvider, transactionsProvider, _) {
          final user = userProvider.user;
          final recentTransactions = transactionsProvider.recentTransactions;
          final nextStep = userProvider.nextRequiredStep;

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
            children: [
              const DebugStatusBanner(),
              Row(
                children: [
                  ProfileAvatar(label: user?.initials ?? 'DP', size: 48),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'WELCOME BACK',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _greeting(user?.firstName ?? user?.displayName ?? 'there'),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceHigh,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.outline),
                    ),
                    child: const Icon(Icons.notifications_none_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _OnboardingGuidanceCard(step: nextStep),
              const SizedBox(height: 24),
              KineticPanel(
                glass: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Available balance',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium
                          ?.copyWith(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _currency.format(user?.balance ?? 0),
                      style: Theme.of(context).textTheme.displayMedium,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        StatusBadge(
                          label: user?.isKycApproved == true ? 'KYC Verified' : 'KYC Pending',
                          color: user?.isKycApproved == true
                              ? AppColors.success
                              : AppColors.warning,
                        ),
                        const SizedBox(width: 8),
                        const StatusBadge(
                          label: 'Secure Payment',
                          color: AppColors.secondary,
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          label: user?.panVerified == true ? 'PAN Verified' : 'PAN Pending',
                          color: user?.panVerified == true
                              ? AppColors.success
                              : AppColors.warning,
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          label: '${beneficiaryProvider.beneficiaries.length} beneficiaries',
                          color: AppColors.secondary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _ActionCard(
                      title: 'Create payment',
                      subtitle: 'Pay bills and settle to linked account',
                      gradient: const LinearGradient(
                        colors: [AppColors.primaryDim, Color(0xFF7A33ED)],
                      ),
                      icon: Icons.arrow_outward_rounded,
                      onTap: () => context.go('/payments'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ActionCard(
                      title: user?.isKycApproved == true ? 'Manage profile' : 'Complete KYC',
                      subtitle: user?.isKycApproved == true
                          ? 'Keep compliance details current'
                          : 'Unlock compliant settlement access',
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2787C8), AppColors.secondary],
                      ),
                      icon: Icons.verified_user_outlined,
                      onTap: () => context.go('/profile'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: KineticPanel(
                      child: _StatTile(
                        label: 'Transactions',
                        value: '${recentTransactions.length}',
                        accent: AppColors.success,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: KineticPanel(
                      color: AppColors.surfaceLow,
                      child: _StatTile(
                        label: 'Needs attention',
                        value:
                            '${recentTransactions.where((item) => item.isFailed || item.openReconciliationCount > 0).length}',
                        accent: AppColors.tertiary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SectionHeading(
                title: 'Recent activity',
                subtitle: transactionsProvider.error,
                actionLabel: 'View all',
                onActionTap: () => context.push('/transfers'),
              ),
              const SizedBox(height: 12),
              if (transactionsProvider.isLoading && recentTransactions.isEmpty)
                const _TransactionsLoading()
              else if (recentTransactions.isEmpty)
                KineticPanel(
                  color: AppColors.surfaceLow,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('No transactions yet', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 8),
                      Text(
                        'Create your first payment from the Payments tab once your profile is ready.',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                )
              else
                ...recentTransactions.take(4).map(
                      (transaction) => _ActivityTile(
                        transaction: transaction,
                        onTap: () => context.push('/transfers/${transaction.id}'),
                      ),
                    ),
            ],
          );
        },
      ),
    );
  }

  String _greeting(String name) {
    final hour = DateTime.now().hour;
    final prefix = hour < 12
        ? 'Good morning'
        : hour < 18
            ? 'Good afternoon'
            : 'Good evening';
    return '$prefix, $name';
  }
}

class _OnboardingGuidanceCard extends StatelessWidget {
  const _OnboardingGuidanceCard({required this.step});

  final OnboardingStep step;

  @override
  Widget build(BuildContext context) {
    if (step == OnboardingStep.onboardingComplete) {
      return const SizedBox.shrink();
    }

    String title;
    String subtitle;
    IconData icon;
    Color color;
    VoidCallback? onTap;

    switch (step) {
      case OnboardingStep.mobileVerified:
        title = 'Authentication Pending';
        subtitle = 'Please sign in again to verify your number.';
        icon = Icons.phonelink_lock_rounded;
        color = AppColors.warning;
        onTap = () => context.go('/login');
        break;
      case OnboardingStep.kycRequired:
        title = 'Identity Verification';
        subtitle = 'Complete KYC to unlock full settlement features.';
        icon = Icons.face_retouching_natural_rounded;
        color = AppColors.primary;
        onTap = () => context.go('/kyc');
        break;
      case OnboardingStep.panRequired:
        title = 'PAN Verification';
        subtitle = 'Government regulations require PAN for bill payments.';
        icon = Icons.badge_outlined;
        color = AppColors.tertiary;
        onTap = () => context.go('/profile');
        break;
      case OnboardingStep.beneficiaryRequired:
        title = 'Add Beneficiary';
        subtitle = 'Add your bank account to receive settlements.';
        icon = Icons.account_balance_rounded;
        color = AppColors.secondary;
        onTap = () => context.go('/accounts');
        break;
      case OnboardingStep.onboardingComplete:
        return const SizedBox.shrink();
    }

    return KineticPanel(
      color: color.withValues(alpha: 0.1),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.lgRadius),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
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
                        .bodySmall
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final Gradient gradient;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppTheme.xlRadius),
      onTap: onTap,
      child: Ink(
        height: 168,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(AppTheme.xlRadius),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.topRight,
                child: Icon(icon, color: Colors.white70),
              ),
              const Spacer(),
              Text(
                title,
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: Colors.white70),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 10),
        Text(value, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 6),
        Row(
          children: [
            Icon(Icons.trending_up_rounded, color: accent, size: 14),
            const SizedBox(width: 4),
            Text(
              'live',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: accent),
            ),
          ],
        ),
      ],
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({
    required this.transaction,
    required this.onTap,
  });

  final TransactionSummary transaction;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final amountColor = transaction.isFailed
        ? AppColors.warning
        : transaction.isCompleted
            ? AppColors.success
            : AppColors.text;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.lgRadius),
        onTap: onTap,
        child: KineticPanel(
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
                  transaction.isCompleted
                      ? Icons.check_circle_outline_rounded
                      : transaction.isFailed
                          ? Icons.error_outline_rounded
                          : Icons.north_east_rounded,
                  color: transaction.isCompleted
                      ? AppColors.success
                      : transaction.isFailed
                          ? AppColors.warning
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
                      '${transaction.status} • ${DateFormat('MMM d, h:mm a').format(transaction.createdAt)}',
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
                    NumberFormat.currency(symbol: 'INR ', decimalDigits: 2)
                        .format(transaction.amount),
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(color: amountColor),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    transaction.payoutStatus,
                    style: Theme.of(context)
                        .textTheme
                        .labelMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ],
          ),
        ),
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
