import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/user_service.dart';
import '../core/exceptions.dart';

class UserProvider extends ChangeNotifier {
  final UserService _userService;

  User? _user;
  double _balance = 0;
  bool _isLoading = false;
  String? _error;

  UserProvider(this._userService);

  // Getters
  User? get user => _user;
  double get balance => _balance;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Load user profile
  Future<void> loadProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _userService.getProfile();
      _balance = _user?.balance ?? 0;
    } on ApiError catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to load profile';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh balance
  Future<void> refreshBalance() async {
    try {
      _balance = await _userService.getBalance();
    } catch (e) {
      _error = 'Failed to refresh balance';
    }
    notifyListeners();
  }

  /// Update profile
  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _userService.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
      );
    } on ApiError catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to update profile';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
