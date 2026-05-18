import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/user_provider.dart';
import '../../widgets/kinetic_primitives.dart';

class PanScreen extends StatefulWidget {
  const PanScreen({super.key});

  @override
  State<PanScreen> createState() => _PanScreenState();
}

class _PanScreenState extends State<PanScreen> {
  final _panController = TextEditingController();
  final _legalNameController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _panController.dispose();
    _legalNameController.dispose();
    super.dispose();
  }

  Future<void> _submitPan() async {
    if (!_formKey.currentState!.validate()) return;

    final userProvider = context.read<UserProvider>();
    final verified = await userProvider.submitPan(
      panNumber: _panController.text.trim(),
      legalName: _legalNameController.text.trim().isEmpty
          ? null
          : _legalNameController.text.trim(),
    );

    if (!mounted) return;
    if (verified) {
      context.go('/home');
      return;
    }

    final error = userProvider.error;
    if (error != null && error.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  Future<void> _startFallback() async {
    final userProvider = context.read<UserProvider>();
    final started = await userProvider.startPanFallbackVerification();
    if (!mounted) return;

    if (started) {
      context.go('/home');
      return;
    }

    final error = userProvider.error;
    if (error != null && error.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.go('/home'),
                    icon: const Icon(Icons.arrow_back_rounded),
                  ),
                  const SizedBox(width: 8),
                  Text('PAN verification', style: Theme.of(context).textTheme.headlineSmall),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'We verify your PAN with Cashfree before enabling beneficiary setup and transfers.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.textMuted),
              ),
              const SizedBox(height: 24),
              KineticPanel(
                glass: true,
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Consumer<UserProvider>(
                    builder: (context, userProvider, _) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: _panController,
                            textCapitalization: TextCapitalization.characters,
                            decoration: const InputDecoration(
                              labelText: 'PAN number',
                              hintText: 'ABCDE1234F',
                            ),
                            validator: (value) {
                              final pan = value?.trim().toUpperCase() ?? '';
                              if (!RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$').hasMatch(pan)) {
                                return 'Enter a valid PAN';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _legalNameController,
                            decoration: InputDecoration(
                              labelText: 'Legal name (optional)',
                              hintText: userProvider.user?.displayName ?? 'As per PAN',
                            ),
                          ),
                          const SizedBox(height: 24),
                          GradientButton(
                            label: 'Verify PAN',
                            icon: Icons.verified_rounded,
                            isLoading: userProvider.isLoading,
                            onPressed: _submitPan,
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: userProvider.isLoading ? null : _startFallback,
                            icon: const Icon(Icons.upload_file_rounded),
                            label: const Text('Upload PAN via Didit instead'),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
