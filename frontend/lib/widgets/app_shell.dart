import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/app_theme.dart';

class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.child,
    required this.location,
  });

  final Widget child;
  final String location;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppGradients.pageBackground),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: AppTheme.glowingOrb(AppColors.primary),
            ),
          ),
          Positioned(
            bottom: 140,
            left: -70,
            child: Container(
              width: 180,
              height: 180,
              decoration: AppTheme.glowingOrb(AppColors.secondary, opacity: 0.12),
            ),
          ),
          SafeArea(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              extendBody: true,
              body: child,
              bottomNavigationBar: _BottomNavigationBar(location: location),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomNavigationBar extends StatelessWidget {
  const _BottomNavigationBar({required this.location});

  final String location;

  @override
  Widget build(BuildContext context) {
    final items = [
      const _NavItem('Home', Icons.home_rounded, '/home'),
      const _NavItem('Accounts', Icons.account_balance_wallet_rounded, '/accounts'),
      const _NavItem('Payments', Icons.payments_rounded, '/payments'),
      const _NavItem('Profile', Icons.person_rounded, '/profile'),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.glass,
          borderRadius: BorderRadius.circular(AppTheme.xlRadius),
          border: Border.all(color: AppColors.outline),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 36,
              offset: const Offset(0, 18),
            ),
          ],
        ),
        child: Row(
          children: items.map((item) {
            final active = location == item.route;
            return Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTheme.xlRadius),
                onTap: () {
                  if (!active) {
                    context.go(item.route);
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: active ? AppGradients.kinetic : null,
                          color: active ? null : Colors.transparent,
                          shape: BoxShape.circle,
                          boxShadow: active
                              ? [
                                  BoxShadow(
                                    color: AppColors.primaryDim.withValues(alpha: 0.28),
                                    blurRadius: 18,
                                    offset: const Offset(0, 8),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          item.icon,
                          color: active ? Colors.white : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.label.toUpperCase(),
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(
                              color: active ? AppColors.text : AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon, this.route);

  final String label;
  final IconData icon;
  final String route;
}
