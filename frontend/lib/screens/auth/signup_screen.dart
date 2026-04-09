import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/legal_links.dart';
import '../../widgets/kinetic_primitives.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _acceptedPolicies = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final authProvider = context.read<AuthProvider>();
    await authProvider.signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
    );

    if (!mounted) {
      return;
    }

    if (authProvider.isAuthenticated) {
      await context.read<UserProvider>().loadProfile();
      if (!mounted) {
        return;
      }
      context.go('/home');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(authProvider.error ?? 'Signup failed')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Already have an account?'),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Set up your payment workspace.',
                style: Theme.of(context).textTheme.displayMedium,
              ),
              const SizedBox(height: 10),
              Text(
                'Complete onboarding to manage bill payments and settlement to your linked account.',
                style: Theme.of(context)
                    .textTheme
                    .bodyLarge
                    ?.copyWith(color: AppColors.textMuted),
              ),
              const SizedBox(height: 24),
              KineticPanel(
                glass: true,
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _firstNameController,
                              decoration: const InputDecoration(labelText: 'First name'),
                              validator: (value) =>
                                  value == null || value.trim().isEmpty ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _lastNameController,
                              decoration: const InputDecoration(labelText: 'Last name'),
                              validator: (value) =>
                                  value == null || value.trim().isEmpty ? 'Required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        obscureText: true,
                        enableSuggestions: false,
                        autocorrect: false,
                        enableIMEPersonalizedLearning: false,
                        enableInteractiveSelection: false,
                        decoration: const InputDecoration(
                          labelText: 'Mobile number',
                          prefixIcon: Icon(Icons.phone_iphone_rounded),
                        ),
                        validator: (value) {
                          final digits = value?.replaceAll(RegExp(r'[^0-9+]'), '') ?? '';
                          if (digits.length < 10) {
                            return 'Enter a valid phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        obscureText: true,
                        enableSuggestions: false,
                        autocorrect: false,
                        enableIMEPersonalizedLearning: false,
                        enableInteractiveSelection: false,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.alternate_email_rounded),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(value.trim())) {
                            return 'Enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        enableSuggestions: false,
                        autocorrect: false,
                        enableIMEPersonalizedLearning: false,
                        enableInteractiveSelection: false,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock_outline_rounded),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Password is required';
                          }
                          if (value.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: true,
                        enableSuggestions: false,
                        autocorrect: false,
                        enableIMEPersonalizedLearning: false,
                        enableInteractiveSelection: false,
                        decoration: const InputDecoration(
                          labelText: 'Confirm password',
                          prefixIcon: Icon(Icons.verified_user_outlined),
                        ),
                        validator: (value) {
                          if (value != _passwordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      Consumer<AuthProvider>(
                        builder: (context, authProvider, _) {
                          return GradientButton(
                            label: 'Create account',
                            icon: Icons.person_add_alt_1_rounded,
                            isLoading: authProvider.isLoading,
                            onPressed: authProvider.isLoading || !_acceptedPolicies
                                ? null
                                : _handleSignup,
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        value: _acceptedPolicies,
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.secondary,
                        title: const Text(
                          'I agree to Terms, Privacy, and Refund Policy.',
                        ),
                        onChanged: (value) {
                          setState(() => _acceptedPolicies = value ?? false);
                        },
                      ),
                      const SizedBox(height: 8),
                      const LegalLinks(compact: true),
                    ],
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
