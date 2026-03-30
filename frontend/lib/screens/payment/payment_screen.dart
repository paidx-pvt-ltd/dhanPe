import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/payment_provider.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({Key? key}) : super(key: key);

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _handleCreatePayment() async {
    if (!_formKey.currentState!.validate()) return;

    final paymentProvider = context.read<PaymentProvider>();
    
    await paymentProvider.createPayment(
      amount: double.parse(_amountController.text),
      description: _descriptionController.text,
    );

    if (mounted) {
      if (paymentProvider.currentPayment != null) {
        // Navigate to payment status screen
        context.go(
          '/payment-status/${paymentProvider.currentPayment!.id}',
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(paymentProvider.error ?? 'Failed to create payment'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Initiate Payment'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),
                Text(
                  'Enter Payment Details',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _amountController,
                  decoration: const InputDecoration(
                    labelText: 'Amount (₹)',
                    prefixIcon: Icon(Icons.currency_rupee),
                    prefixText: '₹ ',
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Amount is required';
                    }
                    final amount = double.tryParse(value);
                    if (amount == null || amount <= 0) {
                      return 'Enter a valid amount';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (Optional)',
                    prefixIcon: Icon(Icons.description_outlined),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 32),
                Consumer<PaymentProvider>(
                  builder: (context, paymentProvider, _) {
                    return ElevatedButton(
                      onPressed: paymentProvider.isLoading
                          ? null
                          : _handleCreatePayment,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: paymentProvider.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Continue to Payment'),
                    );
                  },
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'You will be redirected to Cashfree checkout',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
