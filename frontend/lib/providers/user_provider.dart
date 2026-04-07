import 'package:flutter/material.dart';
import 'dart:async';
import 'package:didit_sdk/sdk_flutter.dart';
import '../models/user.dart';
import '../services/user_service.dart';
import '../core/exceptions.dart';

class UserProvider extends ChangeNotifier {
  final UserService _userService;

  User? _user;
  double _balance = 0;
  bool _isLoading = false;
  String? _error;
  Timer? _kycPollingTimer;

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
      _syncKycPolling();
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
      _syncKycPolling();
    } on ApiError catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to update profile';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyIdentity() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final verificationSession = await _userService.createKycSession();
      final result = await DiditSdk.startVerification(verificationSession.sessionToken);

      switch (result) {
        case VerificationCompleted(:final session):
          final syncedUser = await _userService.syncKycSession(session.sessionId);
          _user = syncedUser;
          _balance = syncedUser.balance;
          _syncKycPolling();

          if (syncedUser.kycStatus == 'APPROVED') {
            return true;
          }

          _error = _buildStatusMessage(syncedUser.kycStatus);
          return false;
        case VerificationCancelled():
          _error = 'Identity verification was cancelled.';
          return false;
        case VerificationFailed(:final error):
          _error = error.message;
          return false;
      }
    } on ApiError catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = 'Failed to complete identity verification';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _buildStatusMessage(String status) {
    switch (status) {
      case 'REJECTED':
        return 'Identity verification was declined. Try again or contact support.';
      case 'SUBMITTED':
        return 'Identity verification is under review.';
      default:
        return 'Identity verification is still pending.';
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> refreshProfileSilently() async {
    try {
      final user = await _userService.getProfile();
      _user = user;
      _balance = user.balance;
      _syncKycPolling();
      notifyListeners();
    } catch (_) {
      // Keep the last known UI state when silent refresh fails.
    }
  }

  void _syncKycPolling() {
    final status = _user?.kycStatus;
    final shouldPoll = status == 'PENDING' || status == 'SUBMITTED';

    if (!shouldPoll) {
      _kycPollingTimer?.cancel();
      _kycPollingTimer = null;
      return;
    }

    _kycPollingTimer ??= Timer.periodic(
      const Duration(seconds: 15),
      (_) => refreshProfileSilently(),
    );
  }

  @override
  void dispose() {
    _kycPollingTimer?.cancel();
    super.dispose();
  }
}
