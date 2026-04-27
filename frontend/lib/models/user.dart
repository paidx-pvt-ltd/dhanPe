class User {
  final String id;
  final String mobileNumber;
  final bool isMobileVerified;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? phoneNumber;
  final String? panNumber;
  final String? panName;
  final bool panVerified;
  final DateTime? panVerifiedAt;
  final String? addressLine1;
  final String? city;
  final String? state;
  final String? postalCode;
  final String countryCode;
  final String kycStatus;
  final bool isAdmin;
  final double balance;
  final DateTime createdAt;

  User({
    required this.id,
    required this.mobileNumber,
    required this.isMobileVerified,
    this.email,
    this.firstName,
    this.lastName,
    this.phoneNumber,
    this.panNumber,
    this.panName,
    required this.panVerified,
    this.panVerifiedAt,
    this.addressLine1,
    this.city,
    this.state,
    this.postalCode,
    required this.countryCode,
    required this.kycStatus,
    required this.isAdmin,
    required this.balance,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final createdAtValue =
        json['createdAt'] as String? ?? DateTime.now().toIso8601String();

    return User(
      id: json['id'] as String,
      mobileNumber: json['mobileNumber'] as String? ?? '',
      isMobileVerified: json['isMobileVerified'] as bool? ?? false,
      email: json['email'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      panNumber: json['panNumber'] as String?,
      panName: json['panName'] as String?,
      panVerified: json['panVerified'] as bool? ?? false,
      panVerifiedAt: json['panVerifiedAt'] != null
          ? DateTime.tryParse(json['panVerifiedAt'] as String)
          : null,
      addressLine1: json['addressLine1'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      postalCode: json['postalCode'] as String?,
      countryCode: json['countryCode'] as String? ?? '+91',
      kycStatus: json['kycStatus'] as String? ?? 'PENDING',
      isAdmin: json['isAdmin'] as bool? ?? false,
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(createdAtValue),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mobileNumber': mobileNumber,
      'isMobileVerified': isMobileVerified,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phoneNumber': phoneNumber,
      'panNumber': panNumber,
      'panName': panName,
      'panVerified': panVerified,
      'panVerifiedAt': panVerifiedAt?.toIso8601String(),
      'addressLine1': addressLine1,
      'city': city,
      'state': state,
      'postalCode': postalCode,
      'countryCode': countryCode,
      'kycStatus': kycStatus,
      'isAdmin': isAdmin,
      'balance': balance,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? mobileNumber,
    bool? isMobileVerified,
    String? email,
    String? firstName,
    String? lastName,
    String? phoneNumber,
    String? panNumber,
    String? panName,
    bool? panVerified,
    DateTime? panVerifiedAt,
    String? addressLine1,
    String? city,
    String? state,
    String? postalCode,
    String? countryCode,
    String? kycStatus,
    bool? isAdmin,
    double? balance,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      mobileNumber: mobileNumber ?? this.mobileNumber,
      isMobileVerified: isMobileVerified ?? this.isMobileVerified,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      panNumber: panNumber ?? this.panNumber,
      panName: panName ?? this.panName,
      panVerified: panVerified ?? this.panVerified,
      panVerifiedAt: panVerifiedAt ?? this.panVerifiedAt,
      addressLine1: addressLine1 ?? this.addressLine1,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      countryCode: countryCode ?? this.countryCode,
      kycStatus: kycStatus ?? this.kycStatus,
      isAdmin: isAdmin ?? this.isAdmin,
      balance: balance ?? this.balance,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  String get displayName {
    final fullName = '${firstName ?? ''} ${lastName ?? ''}'.trim();
    if (fullName.isNotEmpty) {
      return fullName;
    }
    if ((email ?? '').trim().isNotEmpty) {
      return email!;
    }
    return mobileNumber;
  }

  String get initials {
    final source = displayName.trim();
    if (source.isEmpty) {
      return 'DP';
    }

    final parts = source
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.length == 1) {
      final end = parts.first.length < 2 ? parts.first.length : 2;
      return parts.first.substring(0, end).toUpperCase();
    }

    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  bool get isKycApproved => kycStatus == 'APPROVED';
  bool get needsPanVerification => !panVerified;
}
