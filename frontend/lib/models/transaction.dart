class Transaction {
  final String id;
  final String type; // DEBIT, CREDIT, REFUND
  final double amount;
  final String status; // PENDING, SUCCESS, FAILED
  final String? description;
  final DateTime createdAt;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.status,
    this.description,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String,
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'amount': amount,
      'status': status,
      'description': description,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  bool get isDebit => type == 'DEBIT';
  bool get isCredit => type == 'CREDIT';
  bool get isRefund => type == 'REFUND';
  bool get isSuccess => status == 'SUCCESS';
}
