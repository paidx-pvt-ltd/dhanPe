import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:didit_sdk/sdk_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/kyc_session.dart';
import '../models/user.dart';
import '../services/user_service.dart';
import '../core/exceptions.dart';

enum OnboardingStep {
  mobileVerified,
  kycRequired,
  panRequired,
  beneficiaryRequired,
  onboardingComplete,
}

class UserProvider extends ChangeNotifier {
  final UserService _userService;

  User? _user;
  double _balance = 0;
  bool _isLoading = false;
  String? _error;
  Timer? _kycPollingTimer;
  Timer? _activeSessionPollingTimer;
  String? _activeKycSessionId;
  String? _activeKycVerificationUrl;

  bool _hasBeneficiaries = true; // Default to true to avoid flash before load

  UserProvider(this._userService);

  // Getters
  User? get user => _user;
  double get balance => _balance;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get activeKycVerificationUrl => _activeKycVerificationUrl;
  bool get hasActiveHostedKyc =>
      _activeKycVerificationUrl != null && _activeKycSessionId != null;

  OnboardingStep get nextRequiredStep {
    final currentUser = _user;
    if (currentUser == null) return OnboardingStep.mobileVerified;

    // 1. Mobile Verification
    if (!currentUser.isMobileVerified) return OnboardingStep.mobileVerified;

    // 2. KYC Verification
    if (currentUser.kycStatus != 'APPROVED') return OnboardingStep.kycRequired;

    // 3. PAN Verification
    if (!currentUser.panVerified) return OnboardingStep.panRequired;

    // 4. Beneficiary Setup
    if (!_hasBeneficiaries) return OnboardingStep.beneficiaryRequired;

    return OnboardingStep.onboardingComplete;
  }

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

  /// Setter for beneficiary status
  void setHasBeneficiaries(bool value) {
    if (_hasBeneficiaries != value) {
      _hasBeneficiaries = value;
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
    String? addressLine1,
    String? city,
    String? state,
    String? postalCode,
    String? countryCode,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _userService.updateProfile(
        firstName: firstName,
        lastName: lastName,
        contactNumber: phoneNumber,
        addressLine1: addressLine1,
        city: city,
        state: state,
        postalCode: postalCode,
        countryCode: countryCode,
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

  Future<bool> submitPan({required String panNumber, String? legalName}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _userService.submitPan(
        panNumber: panNumber,
        legalName: legalName,
      );
      _balance = _user?.balance ?? 0;
      _syncKycPolling();
      return true;
    } on ApiError catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'Failed to verify PAN';
      return false;
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
      _trackActiveKycSession(verificationSession);

      if (kIsWeb) {
        final launched = await _openHostedVerification();
        _beginActiveSessionPolling();

        if (!launched) {
          _error =
              'Could not open Didit verification in the browser. Try again.';
          return false;
        }

        _error =
            'Didit verification opened in a new tab. Complete it there and this screen will update automatically.';
        return false;
      }

      final result = await DiditSdk.startVerification(
        verificationSession.sessionToken,
      );

      switch (result) {
        case VerificationCompleted(:final session):
          return _syncAndResolveKycStatus(
            sessionId: session.sessionId,
            fallbackStatusMessage: 'Identity verification is being reviewed.',
          );
        case VerificationCancelled():
          final resolved = await _syncAndResolveKycStatus(
            sessionId: verificationSession.sessionId,
            allowPendingPolling: true,
            fallbackStatusMessage: 'Identity verification was cancelled.',
          );

          if (resolved) {
            return true;
          }

          if (_user?.kycStatus == 'PENDING') {
            _error = 'Identity verification was cancelled.';
          }

          return false;
        case VerificationFailed(:final error):
          final resolved = await _syncAndResolveKycStatus(
            sessionId: verificationSession.sessionId,
            allowPendingPolling: true,
            fallbackStatusMessage: error.message,
          );

          if (resolved) {
            return true;
          }

          if (_user?.kycStatus == 'PENDING' &&
              verificationSession.verificationUrl != null) {
            final launched = await _openHostedVerification();
            if (launched) {
              _beginActiveSessionPolling();
              _error =
                  'Native verification did not complete. Continue with Didit in the browser and this screen will update automatically.';
            } else {
              _error = error.message;
            }
          } else {
            _error = error.message;
          }

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

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void seedUser(User user) {
    _user = user;
    _balance = user.balance;
    _error = null;
    _syncKycPolling();
    notifyListeners();
  }

  void clearState() {
    _kycPollingTimer?.cancel();
    _activeSessionPollingTimer?.cancel();
    _kycPollingTimer = null;
    _activeSessionPollingTimer = null;
    _user = null;
    _balance = 0;
    _error = null;
    _isLoading = false;
    _activeKycSessionId = null;
    _activeKycVerificationUrl = null;
    _hasBeneficiaries = true;
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

  void _trackActiveKycSession(KycSession verificationSession) {
    _activeKycSessionId = verificationSession.sessionId;
    _activeKycVerificationUrl = verificationSession.verificationUrl;
  }

  Future<bool> _openHostedVerification() async {
    final verificationUrl = _activeKycVerificationUrl;
    if (verificationUrl == null || verificationUrl.isEmpty) {
      return false;
    }

    final uri = Uri.tryParse(verificationUrl);
    if (uri == null) {
      return false;
    }

    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<bool> _syncAndResolveKycStatus({
    required String sessionId,
    bool allowPendingPolling = false,
    required String fallbackStatusMessage,
  }) async {
    final syncedUser = await _userService.syncKycSession(sessionId);
    _user = syncedUser;
    _balance = syncedUser.balance;
    _syncKycPolling();

    if (syncedUser.kycStatus == 'APPROVED') {
      _clearActiveKycSession();
      return true;
    }

    if (allowPendingPolling &&
        (syncedUser.kycStatus == 'PENDING' ||
            syncedUser.kycStatus == 'SUBMITTED')) {
      _beginActiveSessionPolling();
    } else if (syncedUser.kycStatus != 'PENDING') {
      _clearActiveKycSession();
    }

    _error = _buildStatusMessage(syncedUser.kycStatus, fallbackStatusMessage);
    return false;
  }

  String _buildStatusMessage(String status, [String? fallback]) {
    switch (status) {
      case 'APPROVED':
        return 'Identity verification approved.';
      case 'REJECTED':
        return 'Identity verification was declined. Try again with a clearer document image.';
      case 'SUBMITTED':
        return 'Identity verification is under review.';
      case 'PENDING':
        return fallback ?? 'Identity verification has not been completed yet.';
      default:
        return fallback ?? 'Identity verification status is still pending.';
    }
  }

  void _beginActiveSessionPolling() {
    if (_activeKycSessionId == null) {
      return;
    }

    _activeSessionPollingTimer?.cancel();
    _activeSessionPollingTimer = Timer.periodic(
      const Duration(seconds: 8),
      (_) => _pollActiveSession(),
    );
  }

  Future<void> _pollActiveSession() async {
    final sessionId = _activeKycSessionId;
    if (sessionId == null) {
      return;
    }

    try {
      final syncedUser = await _userService.syncKycSession(sessionId);
      _user = syncedUser;
      _balance = syncedUser.balance;
      _syncKycPolling();

      if (syncedUser.kycStatus != 'PENDING') {
        _error = _buildStatusMessage(syncedUser.kycStatus);
        _clearActiveKycSession();
      }

      notifyListeners();
    } catch (_) {
      // Keep polling until the hosted flow finishes or the user leaves the screen.
    }
  }

  void _clearActiveKycSession() {
    _activeSessionPollingTimer?.cancel();
    _activeSessionPollingTimer = null;
    _activeKycSessionId = null;
    _activeKycVerificationUrl = null;
  }

  @override
  void dispose() {
    _kycPollingTimer?.cancel();
    _activeSessionPollingTimer?.cancel();
    super.dispose();
  }
}
