import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/user_provider.dart';

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
      context.read<UserProvider>().loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final payment = context.watch<PaymentProvider>().currentPayment;

    return Scaffold(
      appBar: AppBar(
        title: const Text('DhanPe'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _showLogoutDialog(context),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => context.read<UserProvider>().loadProfile(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Consumer<UserProvider>(
                builder: (context, userProvider, _) {
                  if (userProvider.isLoading) {
                    return const _OverviewLoader();
                  }

                  return _OverviewCard(
                    name:
                        '${userProvider.user?.firstName ?? ''} ${userProvider.user?.lastName ?? ''}'
                            .trim(),
                    email: userProvider.user?.email ?? '',
                    balance: userProvider.balance,
                    kycStatus: userProvider.user?.kycStatus ?? 'PENDING',
                  );
                },
              ),
              const SizedBox(height: 24),
              Text(
                'Backend Features',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 12),
              _FeatureCard(
                title: 'Create transfer',
                subtitle:
                    'Uses the active backend environment with bank account details.',
                icon: Icons.currency_exchange,
                onTap: () => context.push('/payment'),
              ),
              const SizedBox(height: 12),
              _FeatureCard(
                title: 'Track transfer lifecycle',
                subtitle:
                    'Look up a transaction by ID and view status, payout state, and ledger entries.',
                icon: Icons.receipt_long,
                onTap: () => context.push('/transactions'),
              ),
              const SizedBox(height: 12),
              _FeatureCard(
                title: 'Update profile',
                subtitle:
                    'Edit the profile fields the backend currently supports.',
                icon: Icons.manage_accounts,
                onTap: () => context.push('/profile'),
              ),
              if (payment != null) ...[
                const SizedBox(height: 24),
                Text(
                  'Latest Transfer',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    leading: Icon(
                      payment.isSuccess
                          ? Icons.check_circle
                          : payment.isFailed
                              ? Icons.cancel
                              : Icons.schedule,
                    ),
                    title: Text('Order ${payment.orderId}'),
                    subtitle: Text(payment.status),
                    trailing: Text('Rs ${payment.amount.toStringAsFixed(2)}'),
                    onTap: () => context.push('/payment-status/${payment.id}'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<AuthProvider>().logout();
              if (!context.mounted) return;
              context.go('/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  final String name;
  final String email;
  final double balance;
  final String kycStatus;

  const _OverviewCard({
    required this.name,
    required this.email,
    required this.balance,
    required this.kycStatus,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name.isEmpty ? 'Welcome' : name,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(email),
            const SizedBox(height: 20),
            Text(
              'Balance',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Rs ${balance.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            Text('KYC: $kycStatus'),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(icon),
        title: Text(title),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(subtitle),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _OverviewLoader extends StatelessWidget {
  const _OverviewLoader();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: SizedBox(
        height: 160,
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
