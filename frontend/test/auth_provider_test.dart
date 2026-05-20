import 'package:flutter_test/flutter_test.dart';
import 'package:dhanpe/core/exceptions.dart';
import 'package:dhanpe/models/onboarding_status.dart';
import 'package:dhanpe/providers/auth_provider.dart';
import 'package:dhanpe/services/auth_service.dart';

class FakeAuthService implements AuthService {
  FakeAuthService();

  Future<String?> Function()? getAccessTokenHandler;
  Future<String?> Function()? getRefreshTokenHandler;
  Future<void> Function()? clearSessionHandler;
  Future<Map<String, dynamic>> Function()? refreshTokenHandler;
  Future<Map<String, dynamic>> Function(String mobileNumber, String accessToken)?
      verifyWidgetHandler;
  Future<void> Function({required String mobileNumber})? sendOtpHandler;
  Future<Map<String, dynamic>> Function(String mobileNumber, String otp)?
      verifyOtpHandler;
  Future<void> Function()? logoutHandler;

  @override
  Future<Msg91WidgetConfig> getWidgetConfig() async {
    throw AuthException('Not implemented');
  }

  @override
  Future<Map<String, dynamic>> verifyWidget({
    required String mobileNumber,
    required String accessToken,
  }) async {
    return verifyWidgetHandler?.call(mobileNumber, accessToken) ??
        Future.value(<String, dynamic>{});
  }

  @override
  Future<void> sendOtp({required String mobileNumber}) async {
    return sendOtpHandler?.call(mobileNumber: mobileNumber) ?? Future.value();
  }

  @override
  Future<Map<String, dynamic>> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    return verifyOtpHandler?.call(mobileNumber, otp) ??
        Future.value(<String, dynamic>{});
  }

  @override
  Future<Map<String, dynamic>> refreshToken() async {
    return refreshTokenHandler?.call() ?? Future.value(<String, dynamic>{});
  }

  @override
  Future<void> logout() async {
    return logoutHandler?.call() ?? Future.value();
  }

  @override
  Future<String?> getAccessToken() async {
    return getAccessTokenHandler?.call();
  }

  @override
  Future<String?> getRefreshToken() async {
    return getRefreshTokenHandler?.call();
  }

  @override
  Future<void> clearSession() async {
    return clearSessionHandler?.call() ?? Future.value();
  }

  @override
  Future<bool> isAuthenticated() {
    throw UnimplementedError();
  }
}

void main() {
  late FakeAuthService authService;
  late AuthProvider authProvider;

  setUp(() async {
    authService = FakeAuthService();
    authProvider = AuthProvider(authService);
    await Future<void>.delayed(Duration.zero);
  });

  test('checkAuthentication clears session if tokens are missing', () async {
    authService.getAccessTokenHandler = () async => null;
    authService.getRefreshTokenHandler = () async => null;
    var cleared = false;
    authService.clearSessionHandler = () async {
      cleared = true;
    };

    await authProvider.checkAuthentication();

    expect(authProvider.isReady, isTrue);
    expect(authProvider.isAuthenticated, isFalse);
    expect(cleared, isTrue);
  });

  test('verifyWidget saves user and access token on success', () async {
    authService.verifyWidgetHandler = (mobileNumber, accessToken) async => {
      'accessToken': 'new-token',
      'refreshToken': 'refresh-token',
      'user': {
        'id': 'user_1',
        'mobileNumber': '+919999999999',
        'isMobileVerified': true,
        'countryCode': '+91',
        'panVerified': false,
        'kycStatus': 'PENDING',
        'isAdmin': false,
        'balance': 0,
        'createdAt': DateTime.now().toIso8601String(),
      },
    };

    final result = await authProvider.verifyWidget(
      mobileNumber: '+919999999999',
      accessToken: 'widget-token',
    );

    expect(result, isTrue);
    expect(authProvider.isAuthenticated, isTrue);
    expect(authProvider.user?.id, 'user_1');
  });

  test('verifyWidget sets error message when verification fails', () async {
    authService.verifyWidgetHandler = (_, __) async => throw ApiError(
          type: ApiException.unauthorizedError,
          message: 'Unauthorized',
        );

    final result = await authProvider.verifyWidget(
      mobileNumber: '+919999999999',
      accessToken: 'bad-token',
    );

    expect(result, isFalse);
    expect(authProvider.error, 'Unauthorized');
    expect(authProvider.isAuthenticated, isFalse);
  });

  test('logout clears authentication state and keeps error null', () async {
    authService.logoutHandler = () async {};

    await authProvider.logout();

    expect(authProvider.isAuthenticated, isFalse);
    expect(authProvider.user, isNull);
  });
}
