class Payment {
  final String id;
  final String orderId;
  final String orderToken;
  final double amount;
  final String status; // PENDING, SUCCESS, FAILED, CANCELLED
  final DateTime createdAt;
  final DateTime updatedAt;

  Payment({
    required this.id,
    required this.orderId,
    required this.orderToken,
    required this.amount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? json['cashfreeOrderId'] as String,
      orderToken: json['orderToken'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'PENDING',
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String? ?? json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'orderToken': orderToken,
      'amount': amount,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  bool get isSuccess => status == 'SUCCESS';
  bool get isFailed => status == 'FAILED';
  bool get isPending => status == 'PENDING';
  bool get isCancelled => status == 'CANCELLED';
}
