import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/user_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<UserProvider>().loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, provider, _) {
        final user = provider.user;
        final status = user?.kycStatus ?? 'PENDING';
        final statusColor = _statusColor(status);

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
          children: [
            const SectionHeading(
              title: 'Identity Verification',
              subtitle: 'Required for regulated bill-payment settlement',
            ),
            const SizedBox(height: 16),
            KineticPanel(
              glass: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  StatusBadge(label: status, color: statusColor),
                  const SizedBox(height: 12),
                  Text(
                    _statusDescription(status),
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'We verify identity to prevent fraud, comply with financial regulations, and keep payment settlement secure.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            KineticPanel(
              color: AppColors.surfaceLow,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What to expect',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 10),
                  const _KycStep(
                    number: '1',
                    title: 'Submit verification details',
                    subtitle:
                        'Complete the secure verification flow powered by Didit.',
                  ),
                  const _KycStep(
                    number: '2',
                    title: 'Compliance review',
                    subtitle:
                        'Status can remain pending while checks complete.',
                  ),
                  const _KycStep(
                    number: '3',
                    title: 'Settlement access',
                    subtitle:
                        'Verified users can complete bill-payment settlements to linked accounts.',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GradientButton(
              label: status == 'APPROVED'
                  ? 'Re-run verification'
                  : 'Start verification',
              icon: Icons.verified_user_outlined,
              isLoading: provider.isLoading,
              onPressed: () async {
                final approved = await provider.verifyIdentity();
                if (!context.mounted) {
                  return;
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      approved
                          ? 'Identity verification approved.'
                          : provider.error ??
                                'Verification is still in progress.',
                    ),
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return AppColors.success;
      case 'REJECTED':
        return AppColors.warning;
      default:
        return AppColors.secondary;
    }
  }

  String _statusDescription(String status) {
    switch (status) {
      case 'APPROVED':
        return 'Your account is verified.';
      case 'REJECTED':
        return 'Verification was rejected. Review your details and submit again.';
      default:
        return 'Verification is pending.';
    }
  }
}

class _KycStep extends StatelessWidget {
  const _KycStep({
    required this.number,
    required this.title,
    required this.subtitle,
  });

  final String number;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: AppColors.surfaceHighest,
            child: Text(number, style: Theme.of(context).textTheme.labelMedium),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
