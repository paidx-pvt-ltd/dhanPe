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
  String? _widgetId;

  AuthProvider(this._authService, [HttpClient? httpClient])
      : _httpClient = httpClient ?? (getIt.isRegistered<HttpClient>() ? getIt<HttpClient>() : null) {
    checkAuthentication();
  }

  // Getters
  User? get user => _user;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _accessToken != null;
  bool get isLoading => _isLoading;
  bool get isReady => _isReady;
  String? get error => _error;
  String? get widgetId => _widgetId;

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

  Future<void> loadWidgetConfig() async {
    try {
      final result = await _authService.getWidgetConfig();
      _widgetId = result['widgetId'] as String?;
      notifyListeners();
    } catch (_) {
      _widgetId = null;
    }
  }

  Future<void> loginWithOtp({
    required String mobileNumber,
    required String accessToken,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.verifyOtp(
        mobileNumber: mobileNumber,
        accessToken: accessToken,
      );

      _accessToken = result['accessToken'];
      await _httpClient?.setAuthToken(_accessToken!);
      _user = User.fromJson(result['user']);
      _error = null;
    } on AuthException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Authentication failed: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
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
