class LedgerEntry {
  final String id;
  final String type;
  final double amount;
  final double balanceAfter;
  final String referenceId;
  final DateTime createdAt;

  LedgerEntry({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceAfter,
    required this.referenceId,
    required this.createdAt,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) {
    return LedgerEntry(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      balanceAfter: (json['balanceAfter'] as num?)?.toDouble() ?? 0,
      referenceId: json['referenceId'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class Transaction {
  final String id;
  final String orderId;
  final String? paymentId;
  final String paymentProvider;
  final String status;
  final String payoutStatus;
  final double amount;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<LedgerEntry> ledger;

  Transaction({
    required this.id,
    required this.orderId,
    required this.paymentId,
    required this.paymentProvider,
    required this.status,
    required this.payoutStatus,
    required this.amount,
    required this.description,
    required this.createdAt,
    required this.updatedAt,
    required this.ledger,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? '',
      paymentId: json['paymentId'] as String?,
      paymentProvider: json['paymentProvider'] as String? ?? 'CASHFREE',
      status: json['status'] as String? ?? 'INITIATED',
      payoutStatus: json['payoutStatus'] as String? ?? 'PENDING',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(
        json['updatedAt'] as String? ?? json['createdAt'] as String,
      ),
      ledger: (json['ledger'] as List<dynamic>? ?? const [])
          .map((entry) => LedgerEntry.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isSuccess => status == 'PAID' || status == 'SUCCESS';
  bool get isFailed => status == 'FAILED';
  bool get isPending => !isSuccess && !isFailed;
}
