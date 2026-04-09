import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../models/beneficiary.dart';
import '../../providers/beneficiary_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BeneficiaryProvider>().loadBeneficiaries();
      context.read<UserProvider>().loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<UserProvider, BeneficiaryProvider>(
      builder: (context, userProvider, beneficiaryProvider, _) {
        final beneficiaries = beneficiaryProvider.beneficiaries;
        final verified = beneficiaries.where((item) => item.isVerified).length;
        final pending = beneficiaries.length - verified;

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
          children: [
            const SectionHeading(
              title: 'Accounts',
              subtitle: 'Saved beneficiaries and payout readiness',
            ),
            const SizedBox(height: 18),
            KineticPanel(
              glass: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verified payout lane',
                    style: Theme.of(context)
                        .textTheme
                        .labelMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    userProvider.user?.displayName.toUpperCase() ?? 'DHANPE USER',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    beneficiaries.isEmpty
                        ? 'No beneficiary saved yet'
                        : beneficiaries.first.accountNumberMask,
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      StatusBadge(
                        label: userProvider.user?.isKycApproved == true
                            ? 'KYC Approved'
                            : 'KYC Pending',
                        color: userProvider.user?.isKycApproved == true
                            ? AppColors.success
                            : AppColors.warning,
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(
                        label: '$verified verified',
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
                  child: KineticPanel(
                    child: _MetricBlock(
                      label: 'Saved',
                      value: '${beneficiaries.length}',
                      accent: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: KineticPanel(
                    color: AppColors.surfaceLow,
                    child: _MetricBlock(
                      label: 'Pending',
                      value: '$pending',
                      accent: AppColors.tertiary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            SectionHeading(
              title: 'Beneficiaries',
              subtitle: beneficiaryProvider.error,
              actionLabel: 'Add',
              onActionTap: () => context.go('/payments'),
            ),
            const SizedBox(height: 12),
            if (beneficiaryProvider.isLoading && beneficiaries.isEmpty)
              const _AccountsLoading()
            else if (beneficiaries.isEmpty)
              KineticPanel(
                color: AppColors.surfaceLow,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('No saved beneficiaries', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text(
                      'Add a bank account in Payments, verify it once, and reuse it for future transfers.',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Add beneficiary',
                      icon: Icons.add_rounded,
                      onPressed: () => context.go('/payments'),
                    ),
                  ],
                ),
              )
            else
              ...beneficiaries.map(_BeneficiaryTile.new),
          ],
        );
      },
    );
  }
}

class _MetricBlock extends StatelessWidget {
  const _MetricBlock({
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
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 10),
        Text(value, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 6),
        Container(
          width: 48,
          height: 4,
          decoration: BoxDecoration(
            color: accent,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
      ],
    );
  }
}

class _BeneficiaryTile extends StatelessWidget {
  const _BeneficiaryTile(this.beneficiary);

  final Beneficiary beneficiary;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: KineticPanel(
        color: AppColors.surfaceHigh,
        child: Row(
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: AppColors.surfaceHighest,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                Icons.account_balance_rounded,
                color: beneficiary.isVerified ? AppColors.secondary : AppColors.tertiary,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(beneficiary.label, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    '${beneficiary.accountNumberMask}  •  ${beneficiary.ifsc}',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            StatusBadge(
              label: beneficiary.isVerified ? 'Verified' : 'Pending',
              color: beneficiary.isVerified ? AppColors.success : AppColors.warning,
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountsLoading extends StatelessWidget {
  const _AccountsLoading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            height: 94,
            decoration: AppTheme.panel(color: AppColors.surfaceLow),
          ),
        ),
      ),
    );
  }
}
