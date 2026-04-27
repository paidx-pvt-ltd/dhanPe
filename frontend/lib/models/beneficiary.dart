class Beneficiary {
  const Beneficiary({
    required this.id,
    required this.label,
    required this.accountHolderName,
    required this.accountNumberMask,
    required this.ifsc,
    required this.isVerified,
    required this.status,
    required this.providerStatus,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String label;
  final String accountHolderName;
  final String accountNumberMask;
  final String ifsc;
  final bool isVerified;
  final String status;
  final String? providerStatus;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Beneficiary.fromJson(Map<String, dynamic> json) {
    final createdAtValue =
        json['createdAt'] as String? ?? DateTime.now().toIso8601String();
    final updatedAtValue = json['updatedAt'] as String? ?? createdAtValue;

    return Beneficiary(
      id: json['id'] as String,
      label: (json['label'] as String?)?.trim().isNotEmpty == true
          ? (json['label'] as String).trim()
          : ((json['accountHolderName'] as String?) ?? 'Saved beneficiary'),
      accountHolderName: json['accountHolderName'] as String? ?? '',
      accountNumberMask: json['accountNumberMask'] as String? ?? 'XXXXXX0000',
      ifsc: json['ifsc'] as String? ?? '',
      isVerified:
          json['isVerified'] as bool? ??
          ((json['status'] as String?) == 'VERIFIED'),
      status: json['status'] as String? ?? 'PENDING_VERIFICATION',
      providerStatus: json['providerStatus'] as String?,
      createdAt: DateTime.parse(createdAtValue),
      updatedAt: DateTime.parse(updatedAtValue),
    );
  }
}
