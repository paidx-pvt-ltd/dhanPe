import 'package:flutter/material.dart';

import '../core/app_theme.dart';

class KineticPanel extends StatelessWidget {
  const KineticPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.gradient,
    this.color = AppColors.surfaceHigh,
    this.glass = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Gradient? gradient;
  final Color color;
  final bool glass;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: AppTheme.panel(
        gradient: gradient,
        color: color,
        glass: glass,
      ),
      child: child,
    );
  }
}

class SectionHeading extends StatelessWidget {
  const SectionHeading({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onActionTap,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ],
          ),
        ),
        if (actionLabel != null)
          TextButton(onPressed: onActionTap, child: Text(actionLabel!)),
      ],
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.color = AppColors.primary,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppTheme.pillRadius),
      ),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(padding: EdgeInsets.zero),
      child: Ink(
        decoration: BoxDecoration(
          gradient: onPressed == null ? null : AppGradients.kinetic,
          color: onPressed == null ? AppColors.surfaceHighest : null,
          borderRadius: BorderRadius.circular(AppTheme.pillRadius),
        ),
        child: Container(
          alignment: Alignment.center,
          constraints: const BoxConstraints(minHeight: 58),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 18),
                      const SizedBox(width: 8),
                    ],
                    Text(label),
                  ],
                ),
        ),
      ),
    );
  }
}

/// A horizontal step-progress indicator.
/// [currentStep] is 0-indexed — 0 = first step active, 1 = second, etc.
class StepIndicator extends StatelessWidget {
  const StepIndicator({
    super.key,
    required this.steps,
    required this.currentStep,
  });

  final List<String> steps;
  final int currentStep;

  static const _dotSize = 22.0;
  static const _activeDotSize = 28.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          // Connector lines — positioned at the vertical centre of the dot row
          Positioned(
            top: _activeDotSize / 2 - 0.5,
            left: 0,
            right: 0,
            child: Row(
              children: List.generate(steps.length, (i) {
                return Expanded(
                  child: i == 0 || i == steps.length - 1
                      // First and last segments are half-width spacers
                      ? const SizedBox()
                      : Container(
                          height: 1,
                          color: i <= currentStep
                              ? AppColors.primary
                              : AppColors.outline,
                        ),
                );
              }),
            ),
          ),
          // Connector line segments between dots (between each adjacent pair)
          Positioned(
            top: _activeDotSize / 2 - 0.5,
            left: 0,
            right: 0,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final segmentWidth = constraints.maxWidth / steps.length;
                return Row(
                  children: List.generate(steps.length - 1, (i) {
                    final filled = i < currentStep;
                    return Expanded(
                      child: Container(
                        height: 1,
                        margin: EdgeInsets.only(
                          left: i == 0 ? segmentWidth * 0.5 : 0,
                          right: i == steps.length - 2 ? segmentWidth * 0.5 : 0,
                        ),
                        color: filled ? AppColors.primary : AppColors.outline,
                      ),
                    );
                  }),
                );
              },
            ),
          ),
          // Dots + labels
          Row(
            children: List.generate(steps.length, (index) {
              final isDone = index < currentStep;
              final isActive = index == currentStep;
              final dotColor = isDone || isActive
                  ? AppColors.primary
                  : AppColors.outline;

              return Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                      width: isActive ? _activeDotSize : _dotSize,
                      height: isActive ? _activeDotSize : _dotSize,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isDone
                            ? AppColors.primary
                            : isActive
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : AppColors.surfaceHighest,
                        border: Border.all(
                          color: dotColor,
                          width: isActive ? 2 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: isDone
                          ? const Icon(
                              Icons.check_rounded,
                              size: 13,
                              color: AppColors.background,
                            )
                          : isActive
                          ? Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      steps[index],
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                        color: isActive || isDone
                            ? AppColors.text
                            : AppColors.textMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({super.key, required this.label, this.size = 44});

  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        gradient: AppGradients.kinetic,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.titleMedium?.copyWith(color: Colors.white),
      ),
    );
  }
}
