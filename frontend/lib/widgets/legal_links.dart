import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/legal_config.dart';
import '../core/app_theme.dart';

class LegalLinks extends StatelessWidget {
  const LegalLinks({
    super.key,
    this.compact = false,
  });

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context)
        .textTheme
        .bodySmall
        ?.copyWith(color: AppColors.textMuted);

    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 12,
      runSpacing: compact ? 6 : 10,
      children: [
        _LinkChip(label: 'Terms', uri: LegalConfig.termsUrl, textStyle: style),
        _LinkChip(label: 'Privacy', uri: LegalConfig.privacyUrl, textStyle: style),
        _LinkChip(label: 'Refund Policy', uri: LegalConfig.refundPolicyUrl, textStyle: style),
        _LinkChip(label: 'Support', uri: LegalConfig.supportUrl, textStyle: style),
      ],
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip({
    required this.label,
    required this.uri,
    this.textStyle,
  });

  final String label;
  final String uri;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        final target = Uri.parse(uri);
        final launched = await launchUrl(target, mode: LaunchMode.externalApplication);
        if (!launched && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open $label')),
          );
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
        child: Text(
          label,
          style: textStyle?.copyWith(
            decoration: TextDecoration.underline,
            color: AppColors.secondary,
          ),
        ),
      ),
    );
  }
}
