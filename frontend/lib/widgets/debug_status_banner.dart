import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/config.dart';
import '../core/app_theme.dart';
import '../providers/user_provider.dart';

class DebugStatusBanner extends StatelessWidget {
  const DebugStatusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    if (!Config.debugMode) {
      return const SizedBox.shrink();
    }

    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        final kycStatus = userProvider.user?.kycStatus ?? 'unknown';
        return Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.outline),
          ),
          child: DefaultTextStyle(
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              height: 1.4,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Debug Runtime',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text('API env: ${Config.apiEnvironment}'),
                Text('API base: ${Config.baseUrl}'),
                Text('Cashfree env: ${Config.cashfreeEnvironment}'),
                Text('KYC status: $kycStatus'),
              ],
            ),
          ),
        );
      },
    );
  }
}
