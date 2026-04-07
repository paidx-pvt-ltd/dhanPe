import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/debug_status_banner.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final userProvider = context.read<UserProvider>();
    final authUser = context.read<AuthProvider>().user;

    if (userProvider.user == null && authUser != null) {
      userProvider.seedUser(authUser);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        context.read<UserProvider>().loadProfile();
      });
    }

    if (_initialized) return;

    final user = userProvider.user;
    _firstNameController.text = user?.firstName ?? '';
    _lastNameController.text = user?.lastName ?? '';
    _phoneController.text = user?.phoneNumber ?? '';
    _initialized = true;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<UserProvider>();
    await provider.updateProfile(
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      phoneNumber: _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
    );

    if (!mounted) return;

    if (provider.error == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error!)),
      );
    }
  }

  Future<void> _verifyIdentity() async {
    final provider = context.read<UserProvider>();
    final approved = await provider.verifyIdentity();

    if (!mounted) return;

    final message = approved
        ? 'Identity verification approved.'
        : provider.error ?? 'Identity verification was not completed.';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Consumer<UserProvider>(
          builder: (context, userProvider, _) {
            final user = userProvider.user;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const DebugStatusBanner(),
                    const SizedBox(height: 16),
                    Text(
                      user?.email ?? 'No email available',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'KYC status: ${user?.kycStatus ?? 'PENDING'}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if ((user?.kycStatus ?? 'PENDING') == 'PENDING' ||
                        (user?.kycStatus ?? 'PENDING') == 'SUBMITTED') ...[
                      const SizedBox(height: 6),
                      Text(
                        'This screen auto-refreshes your verification status every 15 seconds.',
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                      ),
                    ],
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(
                        labelText: 'First name',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'First name is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(
                        labelText: 'Last name',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Last name is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        labelText: 'Phone number',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: userProvider.isLoading ? null : _verifyIdentity,
                      icon: const Icon(Icons.verified_user_outlined),
                      label: Text(
                        (user?.kycStatus ?? 'PENDING') == 'APPROVED'
                            ? 'Re-run identity verification'
                            : 'Verify identity with Didit',
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: userProvider.isLoading ? null : _saveProfile,
                      child: userProvider.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Save profile'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
