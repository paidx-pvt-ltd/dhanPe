class LegalConfig {
  static const termsUrl = String.fromEnvironment(
    'DHANPE_TERMS_URL',
    defaultValue: 'https://example.com/terms',
  );
  static const privacyUrl = String.fromEnvironment(
    'DHANPE_PRIVACY_URL',
    defaultValue: 'https://example.com/privacy',
  );
  static const refundPolicyUrl = String.fromEnvironment(
    'DHANPE_REFUND_URL',
    defaultValue: 'https://example.com/refunds',
  );
  static const supportUrl = String.fromEnvironment(
    'DHANPE_SUPPORT_URL',
    defaultValue: 'mailto:support@dhanpe.app',
  );
}
