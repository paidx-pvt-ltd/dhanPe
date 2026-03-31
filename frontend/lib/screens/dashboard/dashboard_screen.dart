import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../providers/payment_provider.dart';

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
      context.read<PaymentProvider>().loadPaymentHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DhanPe'),
        centerTitle: true,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _showLogoutDialog(context),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await context.read<UserProvider>().loadProfile();
            await context.read<PaymentProvider>().loadPaymentHistory();
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Card
                Consumer<UserProvider>(
                  builder: (context, userProvider, _) {
                    if (userProvider.isLoading) {
                      return const _BalanceCardLoader();
                    }
                    return _BalanceCard(
                      balance: userProvider.balance,
                      userName:
                          '${userProvider.user?.firstName} ${userProvider.user?.lastName}',
                    );
                  },
                ),
                const SizedBox(height: 24),
                
                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.payment),
                        label: const Text('Pay'),
                        onPressed: () => context.go('/payment'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.history),
                        label: const Text('History'),
                        onPressed: () => context.go('/transactions'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                // Recent Transactions
                Text(
                  'Recent Transactions',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Consumer<PaymentProvider>(
                  builder: (context, paymentProvider, _) {
                    if (paymentProvider.isLoading) {
                      return const _TransactionListLoader();
                    }
                    if (paymentProvider.paymentHistory.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: Text(
                            'No transactions yet',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: paymentProvider.paymentHistory.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final payment = paymentProvider.paymentHistory[index];
                        return _TransactionTile(payment: payment);
                      },
                    );
                  },
                ),
              ],
            ),
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
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthProvider>().logout();
              context.go('/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final double balance;
  final String userName;

  const _BalanceCard({
    required this.balance,
    required this.userName,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Balance',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              '₹${balance.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              'User: $userName',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceCardLoader extends StatelessWidget {
  const _BalanceCardLoader();

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 24,
              width: 80,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 8),
            Container(
              height: 32,
              width: 150,
              color: Colors.grey[300],
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionListLoader extends StatelessWidget {
  const _TransactionListLoader();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, __) => Container(
        height: 60,
        color: Colors.grey[300],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final dynamic payment;

  const _TransactionTile({required this.payment});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        Icons.payment,
        color: payment.isSuccess ? Colors.green : Colors.orange,
      ),
      title: Text('Payment of ₹${payment.amount.toStringAsFixed(2)}'),
      subtitle: Text(payment.status),
      trailing: Text(
        payment.isSuccess ? '✓' : '...',
        style: TextStyle(
          color: payment.isSuccess ? Colors.green : Colors.orange,
          fontWeight: FontWeight.bold,
        ),
      ),
      onTap: () => context.go('/payment-status/${payment.id}'),
    );
  }
}
