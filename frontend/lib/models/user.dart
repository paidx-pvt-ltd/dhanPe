class User {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? phoneNumber;
  final String kycStatus;
  final double balance;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.phoneNumber,
    required this.kycStatus,
    required this.balance,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final createdAtValue =
        json['createdAt'] as String? ?? DateTime.now().toIso8601String();

    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      kycStatus: json['kycStatus'] as String? ?? 'PENDING',
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(createdAtValue),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phoneNumber': phoneNumber,
      'kycStatus': kycStatus,
      'balance': balance,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phoneNumber,
    String? kycStatus,
    double? balance,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      kycStatus: kycStatus ?? this.kycStatus,
      balance: balance ?? this.balance,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
