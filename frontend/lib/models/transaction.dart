class TransactionBeneficiary {
  const TransactionBeneficiary({
    required this.id,
    required this.label,
    required this.accountHolderName,
    required this.accountNumberMask,
    required this.ifsc,
    required this.status,
  });

  final String id;
  final String? label;
  final String accountHolderName;
  final String accountNumberMask;
  final String? ifsc;
  final String status;

  factory TransactionBeneficiary.fromJson(Map<String, dynamic> json) {
    return TransactionBeneficiary(
      id: json['id'] as String,
      label: json['label'] as String?,
      accountHolderName: json['accountHolderName'] as String? ?? '',
      accountNumberMask: json['accountNumberMask'] as String? ?? '',
      ifsc: json['ifsc'] as String?,
      status: json['status'] as String? ?? 'PENDING_VERIFICATION',
    );
  }

  String get title =>
      (label?.trim().isNotEmpty == true ? label!.trim() : accountHolderName);
}

class TransactionRefund {
  const TransactionRefund({
    required this.id,
    required this.refundId,
    required this.amount,
    required this.currency,
    required this.status,
    required this.reason,
    required this.failureReason,
    required this.createdAt,
  });

  final String id;
  final String refundId;
  final double amount;
  final String currency;
  final String status;
  final String? reason;
  final String? failureReason;
  final DateTime createdAt;

  factory TransactionRefund.fromJson(Map<String, dynamic> json) {
    return TransactionRefund(
      id: json['id'] as String,
      refundId: json['refundId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      status: json['status'] as String? ?? 'PENDING',
      reason: json['reason'] as String?,
      failureReason: json['failureReason'] as String?,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}

class TransactionDispute {
  const TransactionDispute({
    required this.id,
    required this.disputeId,
    required this.phase,
    required this.status,
    required this.amount,
    required this.reasonCode,
    required this.reasonMessage,
    required this.createdAt,
  });

  final String id;
  final String disputeId;
  final String phase;
  final String status;
  final double amount;
  final String? reasonCode;
  final String? reasonMessage;
  final DateTime createdAt;

  factory TransactionDispute.fromJson(Map<String, dynamic> json) {
    return TransactionDispute(
      id: json['id'] as String,
      disputeId: json['disputeId'] as String? ?? '',
      phase: json['phase'] as String? ?? 'DISPUTE',
      status: json['status'] as String? ?? 'OPEN',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      reasonCode: json['reasonCode'] as String?,
      reasonMessage: json['reasonMessage'] as String?,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}

class TransactionReconciliationItem {
  const TransactionReconciliationItem({
    required this.id,
    required this.scope,
    required this.severity,
    required this.status,
    required this.code,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String scope;
  final String severity;
  final String status;
  final String code;
  final String message;
  final DateTime createdAt;

  factory TransactionReconciliationItem.fromJson(Map<String, dynamic> json) {
    return TransactionReconciliationItem(
      id: json['id'] as String,
      scope: json['scope'] as String? ?? 'PAYOUT',
      severity: json['severity'] as String? ?? 'MEDIUM',
      status: json['status'] as String? ?? 'OPEN',
      code: json['code'] as String? ?? '',
      message: json['message'] as String? ?? '',
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}

class TransactionPayout {
  const TransactionPayout({
    required this.id,
    required this.status,
    required this.providerRef,
    required this.providerStatus,
    required this.failureReason,
    required this.createdAt,
  });

  final String id;
  final String status;
  final String? providerRef;
  final String? providerStatus;
  final String? failureReason;
  final DateTime createdAt;

  factory TransactionPayout.fromJson(Map<String, dynamic> json) {
    return TransactionPayout(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      providerRef: json['providerRef'] as String?,
      providerStatus: json['providerStatus'] as String?,
      failureReason: json['failureReason'] as String?,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}

class TransactionSummary {
  const TransactionSummary({
    required this.id,
    required this.orderId,
    required this.status,
    required this.lifecycleState,
    required this.payoutStatus,
    required this.amount,
    required this.grossAmount,
    required this.netPayoutAmount,
    required this.currency,
    required this.description,
    required this.createdAt,
    required this.updatedAt,
    required this.beneficiary,
    required this.latestRefundStatus,
    required this.latestDisputeStatus,
    required this.openReconciliationCount,
  });

  final String id;
  final String orderId;
  final String status;
  final String lifecycleState;
  final String payoutStatus;
  final double amount;
  final double grossAmount;
  final double netPayoutAmount;
  final String currency;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;
  final TransactionBeneficiary? beneficiary;
  final String? latestRefundStatus;
  final String? latestDisputeStatus;
  final int openReconciliationCount;

  factory TransactionSummary.fromJson(Map<String, dynamic> json) {
    return TransactionSummary(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? '',
      status: json['status'] as String? ?? 'INITIATED',
      lifecycleState: json['lifecycleState'] as String? ?? 'INITIATED',
      payoutStatus: json['payoutStatus'] as String? ?? 'PENDING',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      grossAmount: (json['grossAmount'] as num?)?.toDouble() ?? 0,
      netPayoutAmount: (json['netPayoutAmount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      description: json['description'] as String?,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updatedAt'] as String? ??
            json['createdAt'] as String? ??
            DateTime.now().toIso8601String(),
      ),
      beneficiary: json['beneficiary'] is Map<String, dynamic>
          ? TransactionBeneficiary.fromJson(
              json['beneficiary'] as Map<String, dynamic>,
            )
          : null,
      latestRefundStatus: json['latestRefundStatus'] as String?,
      latestDisputeStatus: json['latestDisputeStatus'] as String?,
      openReconciliationCount:
          (json['openReconciliationCount'] as num?)?.toInt() ?? 0,
    );
  }

  bool get isPaid => status == 'PAID';
  bool get isFailed => status == 'FAILED' || payoutStatus == 'FAILED';
  bool get isPending => !isPaid && !isFailed;
  bool get isCompleted =>
      lifecycleState == 'COMPLETED' || payoutStatus == 'SUCCESS';

  String get title =>
      beneficiary?.title ??
      (description?.trim().isNotEmpty == true
          ? description!.trim()
          : 'Transfer');
}

class Transaction extends TransactionSummary {
  const Transaction({
    required super.id,
    required super.orderId,
    required super.status,
    required super.lifecycleState,
    required super.payoutStatus,
    required super.amount,
    required super.grossAmount,
    required super.netPayoutAmount,
    required super.currency,
    required super.description,
    required super.createdAt,
    required super.updatedAt,
    required super.beneficiary,
    required super.latestRefundStatus,
    required super.latestDisputeStatus,
    required super.openReconciliationCount,
    required this.paymentId,
    required this.paymentProvider,
    required this.platformFeeAmount,
    required this.taxAmount,
    required this.feeRuleVersion,
    required this.payout,
    required this.refunds,
    required this.disputes,
    required this.reconciliation,
  });

  final String? paymentId;
  final String paymentProvider;
  final double platformFeeAmount;
  final double taxAmount;
  final String feeRuleVersion;
  final TransactionPayout? payout;
  final List<TransactionRefund> refunds;
  final List<TransactionDispute> disputes;
  final List<TransactionReconciliationItem> reconciliation;

  factory Transaction.fromJson(Map<String, dynamic> json) {
    final refunds = (json['refunds'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(TransactionRefund.fromJson)
        .toList();
    final disputes = (json['disputes'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(TransactionDispute.fromJson)
        .toList();
    final reconciliation =
        (json['reconciliation'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(TransactionReconciliationItem.fromJson)
            .toList();

    return Transaction(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? '',
      status: json['status'] as String? ?? 'INITIATED',
      lifecycleState: json['lifecycleState'] as String? ?? 'INITIATED',
      payoutStatus: json['payoutStatus'] as String? ?? 'PENDING',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      grossAmount: (json['grossAmount'] as num?)?.toDouble() ?? 0,
      netPayoutAmount: (json['netPayoutAmount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      description: json['description'] as String?,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updatedAt'] as String? ??
            json['createdAt'] as String? ??
            DateTime.now().toIso8601String(),
      ),
      beneficiary: json['beneficiary'] is Map<String, dynamic>
          ? TransactionBeneficiary.fromJson(
              json['beneficiary'] as Map<String, dynamic>,
            )
          : null,
      latestRefundStatus: refunds.isNotEmpty ? refunds.last.status : null,
      latestDisputeStatus: disputes.isNotEmpty ? disputes.last.status : null,
      openReconciliationCount: reconciliation
          .where((item) => item.status == 'OPEN')
          .length,
      paymentId: json['paymentId'] as String?,
      paymentProvider: json['paymentProvider'] as String? ?? 'CASHFREE',
      platformFeeAmount: (json['platformFeeAmount'] as num?)?.toDouble() ?? 0,
      taxAmount: (json['taxAmount'] as num?)?.toDouble() ?? 0,
      feeRuleVersion: json['feeRuleVersion'] as String? ?? 'v1',
      payout: json['payout'] is Map<String, dynamic>
          ? TransactionPayout.fromJson(json['payout'] as Map<String, dynamic>)
          : null,
      refunds: refunds,
      disputes: disputes,
      reconciliation: reconciliation,
    );
  }
}
