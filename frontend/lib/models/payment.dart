class Payment {
  final String id;
  final String orderId;
  final String orderToken;
  final double amount;
  final String status;
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
    final createdAtValue =
        json['createdAt'] as String? ?? DateTime.now().toIso8601String();
    final updatedAtValue = json['updatedAt'] as String? ?? createdAtValue;

    return Payment(
      id: json['transactionId'] as String? ?? json['id'] as String,
      orderId: json['orderId'] as String? ??
          json['cashfreeOrderId'] as String? ??
          '',
      orderToken: json['orderToken'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'INITIATED',
      createdAt: DateTime.parse(createdAtValue),
      updatedAt: DateTime.parse(updatedAtValue),
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

  bool get isSuccess => status == 'SUCCESS' || status == 'PAID';
  bool get isFailed => status == 'FAILED';
  bool get isPending => status == 'PENDING' || status == 'INITIATED' || status == 'PROCESSING';
  bool get isCancelled => status == 'CANCELLED';
}
