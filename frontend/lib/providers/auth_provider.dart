import 'package:flutter/material.dart';
import '../models/user.dart';
import '../core/exceptions.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  User? _user;
  String? _accessToken;
  String? _refreshToken;
  bool _isLoading = false;
  bool _isReady = false;
  String? _error;

  AuthProvider(this._authService) {
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
        _refreshToken = null;
        _user = null;
      } else {
        final result = await _authService.refreshToken();
        _accessToken = result['accessToken'];
        _refreshToken = result['refreshToken'];
        _user = User.fromJson(result['user']);
      }
      _error = null;
    } catch (e) {
      await _authService.clearSession();
      _accessToken = null;
      _refreshToken = null;
      _user = null;
      _error = null;
    } finally {
      _isLoading = false;
      _isReady = true;
      notifyListeners();
    }
  }

  /// Sign up
  Future<void> signUp({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.signup(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );

      _accessToken = result['accessToken'];
      _refreshToken = result['refreshToken'];
      _user = User.fromJson(result['user']);
      _error = null;
    } on AuthException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Signup failed: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Login
  Future<void> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.login(
        email: email,
        password: password,
      );

      _accessToken = result['accessToken'];
      _refreshToken = result['refreshToken'];
      _user = User.fromJson(result['user']);
      _error = null;
    } on AuthException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Login failed: ${e.toString()}';
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
      _user = null;
      _accessToken = null;
      _refreshToken = null;
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
      _refreshToken = result['refreshToken'];
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
