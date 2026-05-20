import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:dhanpe/core/exceptions.dart';
import 'package:dhanpe/main.dart';
import 'package:dhanpe/models/user.dart';
import 'package:dhanpe/services/auth_service.dart';
import 'package:dhanpe/services/beneficiary_service.dart';
import 'package:dhanpe/services/cashfree_service.dart';
import 'package:dhanpe/services/device_security_service.dart';
import 'package:dhanpe/services/payment_service.dart';
import 'package:dhanpe/services/service_locator.dart';
import 'package:dhanpe/services/transaction_service.dart';
import 'package:dhanpe/services/user_service.dart';

class _AuthenticatedAuthService extends AuthService {
  _AuthenticatedAuthService() : super(Dio(), const FlutterSecureStorage());

  @override
  Future<String?> getAccessToken() async => 'access-token';

  @override
  Future<String?> getRefreshToken() async => 'refresh-token';

  @override
  Future<Map<String, dynamic>> refreshToken() async {
    return {
      'accessToken': 'refreshed-access-token',
      'refreshToken': 'refreshed-refresh-token',
      'user': {
        'id': 'user_1',
        'mobileNumber': '+919999999999',
        'isMobileVerified': true,
        'email': 'user@example.com',
        'firstName': 'Test',
        'lastName': 'User',
        'phoneNumber': '+919999999999',
        'panVerified': false,
        'kycStatus': 'PENDING',
        'isAdmin': false,
        'balance': 0,
        'createdAt': DateTime.now().toIso8601String(),
      },
    };
  }

  @override
  Future<void> clearSession() async {}

  @override
  Future<void> logout() async {}
}

class _ExpiredAuthService extends AuthService {
  _ExpiredAuthService() : super(Dio(), const FlutterSecureStorage());

  @override
  Future<String?> getAccessToken() async => 'access-token';

  @override
  Future<String?> getRefreshToken() async => 'refresh-token';

  @override
  Future<Map<String, dynamic>> refreshToken() async {
    throw AuthException('Session expired');
  }

  @override
  Future<void> clearSession() async {}

  @override
  Future<void> logout() async {}
}

class _FakeUserService extends UserService {
  _FakeUserService() : super(Dio());

  @override
  Future<User> getProfile() async {
    return User(
      id: 'user_1',
      mobileNumber: '+919999999999',
      isMobileVerified: true,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+919999999999',
      panNumber: null,
      panName: null,
      panVerified: false,
      panVerifiedAt: null,
      addressLine1: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      postalCode: '123456',
      countryCode: '+91',
      kycStatus: 'PENDING',
      isAdmin: false,
      balance: 0,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<Map<String, dynamic>> getOnboardingStatus() async {
    return {
      'currentStep': 'PAN_VERIFICATION',
      'steps': [
        {
          'id': 'MOBILE_VERIFICATION',
          'label': 'Mobile verification',
          'completed': true,
          'required': true,
        },
        {
          'id': 'PAN_VERIFICATION',
          'label': 'PAN verification',
          'completed': false,
          'required': true,
        },
      ],
      'canAddBeneficiary': false,
      'canTransfer': false,
      'panFallbackAvailable': true,
    };
  }
}

class _FakeCashfreeService extends CashfreeService {
  _FakeCashfreeService() : super();
}

class _FakeBeneficiaryService extends BeneficiaryService {
  _FakeBeneficiaryService() : super(Dio());
}

class _FakePaymentService extends PaymentService {
  _FakePaymentService() : super(Dio());
}

class _FakeTransactionService extends TransactionService {
  _FakeTransactionService() : super(Dio());
}

void main() {
  setUp(() async {
    await getIt.reset();
  });

  testWidgets('authenticated users are redirected to the home dashboard', (
    WidgetTester tester,
  ) async {
    getIt.registerSingleton<AuthService>(_AuthenticatedAuthService());
    getIt.registerSingleton<UserService>(_FakeUserService());
    getIt.registerSingleton<BeneficiaryService>(_FakeBeneficiaryService());
    getIt.registerSingleton<CashfreeService>(_FakeCashfreeService());
    getIt.registerSingleton<PaymentService>(_FakePaymentService());
    getIt.registerSingleton<TransactionService>(_FakeTransactionService());

    await tester.pumpWidget(
      const MyApp(
        securityStatus: DeviceSecurityStatus(
          deviceLockEnabled: true,
          deviceCompromised: false,
          installerTrusted: true,
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('WELCOME BACK'), findsOneWidget);
  });

  testWidgets('expired or invalid persisted sessions fall back to login', (
    WidgetTester tester,
  ) async {
    getIt.registerSingleton<AuthService>(_ExpiredAuthService());
    getIt.registerSingleton<UserService>(_FakeUserService());
    getIt.registerSingleton<BeneficiaryService>(_FakeBeneficiaryService());
    getIt.registerSingleton<CashfreeService>(_FakeCashfreeService());
    getIt.registerSingleton<PaymentService>(_FakePaymentService());
    getIt.registerSingleton<TransactionService>(_FakeTransactionService());

    await tester.pumpWidget(
      const MyApp(
        securityStatus: DeviceSecurityStatus(
          deviceLockEnabled: true,
          deviceCompromised: false,
          installerTrusted: true,
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Verify Mobile Number'), findsOneWidget);
    expect(find.text('We will send a secure SMS OTP to verify your number.'), findsOneWidget);
  });
}
