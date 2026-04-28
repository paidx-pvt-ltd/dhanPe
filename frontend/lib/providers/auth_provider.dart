import 'package:flutter/material.dart';
import '../models/user.dart';
import '../core/exceptions.dart';
import '../services/auth_service.dart';
import '../services/http_client.dart';
import '../services/service_locator.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final HttpClient? _httpClient;

  User? _user;
  String? _accessToken;
  bool _isLoading = false;
  bool _isReady = false;
  String? _error;

  AuthProvider(this._authService, [HttpClient? httpClient])
    : _httpClient =
          httpClient ??
          (getIt.isRegistered<HttpClient>() ? getIt<HttpClient>() : null) {
    checkAuthentication();
  }

  // Getters
  User? get user => _user;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _accessToken != null;
  bool get isLoading => _isLoading;
  bool get isReady => _isReady;
  String? get error => _error;

  /// Check if user is authenticated and restore session
  Future<void> checkAuthentication() async {
    _isLoading = true;
    notifyListeners();

    try {
      final accessToken = await _authService.getAccessToken();
      final refreshToken = await _authService.getRefreshToken();

      if (accessToken == null || refreshToken == null) {
        await _authService.clearSession();
        _accessToken = null;
        _user = null;
      } else {
        _accessToken = accessToken;

        try {
          final result = await _authService.refreshToken();
          _accessToken = result['accessToken'];
          await _httpClient?.setAuthToken(_accessToken!);
          _user = User.fromJson(result['user']);
        } on AuthException {
          await _authService.clearSession();
          _httpClient?.clearAuth();
          _accessToken = null;
          _user = null;
        } on ApiError catch (e) {
          if (e.type == ApiException.unauthorizedError) {
            await _authService.clearSession();
            _httpClient?.clearAuth();
            _accessToken = null;
            _user = null;
          }
        }
      }
      _error = null;
    } on AuthException {
      await _authService.clearSession();
      _httpClient?.clearAuth();
      _accessToken = null;
      _user = null;
      _error = null;
    } on ApiError catch (e) {
      if (e.type == ApiException.unauthorizedError) {
        await _authService.clearSession();
        _httpClient?.clearAuth();
        _accessToken = null;
        _user = null;
      }
      _error = null;
    } catch (e) {
      _error = null;
    } finally {
      _isLoading = false;
      _isReady = true;
      notifyListeners();
    }
  }

  Future<bool> requestOtp({required String mobileNumber}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _authService.sendOtp(mobileNumber: mobileNumber);
      return true;
    } on ApiError catch (e) {
      _error = e.message;
    } on AuthException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to send OTP: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> loginWithOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.verifyOtp(
        mobileNumber: mobileNumber,
        otp: otp,
      );

      _accessToken = result['accessToken'];
      await _httpClient?.setAuthToken(_accessToken!);
      _user = User.fromJson(result['user']);
      _error = null;
      return true;
    } on ApiError catch (e) {
      _error = e.message;
    } on AuthException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Authentication failed: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  /// Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _httpClient?.clearAuth();
      _user = null;
      _accessToken = null;
    } catch (e) {
      _error = 'Logout failed';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh token
  Future<void> refreshAccessToken() async {
    try {
      final result = await _authService.refreshToken();
      _accessToken = result['accessToken'];
      await _httpClient?.setAuthToken(_accessToken!);
      _error = null;
    } on AuthException catch (e) {
      _error = e.message;
      // Force logout on refresh failure
      await logout();
    }
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
