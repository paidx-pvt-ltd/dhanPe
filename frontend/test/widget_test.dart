import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dhanpe/core/exceptions.dart';
import 'package:dhanpe/main.dart';
import 'package:dhanpe/services/auth_service.dart';
import 'package:dhanpe/services/device_security_service.dart';
import 'package:dhanpe/services/payment_service.dart';
import 'package:dhanpe/services/service_locator.dart';
import 'package:dhanpe/services/transaction_service.dart';
import 'package:dhanpe/services/user_service.dart';

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super(Dio(), const FlutterSecureStorage());

  @override
  Future<String?> getAccessToken() async => null;

  @override
  Future<String?> getRefreshToken() async => null;

  @override
  Future<void> clearSession() async {}

  @override
  Future<Map<String, dynamic>> refreshToken() async {
    throw AuthException('No session');
  }

  @override
  Future<void> logout() async {}
}

class _FakeUserService extends UserService {
  _FakeUserService() : super(Dio());
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
    getIt.registerSingleton<AuthService>(_FakeAuthService());
    getIt.registerSingleton<UserService>(_FakeUserService());
    getIt.registerSingleton<PaymentService>(_FakePaymentService());
    getIt.registerSingleton<TransactionService>(_FakeTransactionService());
  });

  testWidgets('unauthenticated app lands on the login screen', (WidgetTester tester) async {
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

    expect(find.text('Move money without losing the plot.'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
  });
}
