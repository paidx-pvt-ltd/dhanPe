class KycSession {
  final String sessionId;
  final String sessionToken;
  final String? verificationUrl;
  final String status;

  KycSession({
    required this.sessionId,
    required this.sessionToken,
    required this.status,
    this.verificationUrl,
  });

  factory KycSession.fromJson(Map<String, dynamic> json) {
    return KycSession(
      sessionId: json['sessionId'] as String,
      sessionToken: json['sessionToken'] as String,
      verificationUrl: json['verificationUrl'] as String?,
      status: json['status'] as String? ?? 'Not Started',
    );
  }
}
