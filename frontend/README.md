# DhanPe Frontend

Flutter app for compliant bill payments and linked-account settlement with clear disclosures, KYC status, and lifecycle tracking.

## Quick Start

```bash
cd frontend
flutter pub get
flutter run
```

This app now uses the Didit native Flutter SDK for identity verification, so use Flutter 3.3+ with Dart 3.11+.

## Backend Target Selection

The app uses compile-time configuration from [config.dart](d:/Personal%20Data/dhanPe-local/dhanPe/frontend/lib/config/config.dart).

Current defaults:

- Web debug: production API at `https://project-szw1p.vercel.app/api`
- Android emulator debug: local API at `http://10.0.2.2:3000/api`
- Fallback/release default: production API

To override the backend target explicitly:

```bash
flutter run --dart-define=DHANPE_API_BASE_URL=http://localhost:3000/api
```

Preferred mode-based switching:

```bash
flutter run --dart-define=DHANPE_API_ENV=production
flutter run --dart-define=DHANPE_API_ENV=local --dart-define=DHANPE_LOCAL_API_BASE_URL=http://192.168.1.10:3000/api
flutter run --dart-define=DHANPE_API_ENV=android-emulator
flutter run --dart-define=DHANPE_API_ENV=production --dart-define=DHANPE_CASHFREE_ENV=sandbox
```

Supported compile-time keys:

- `DHANPE_API_ENV=production|local|android-emulator|auto`
- `DHANPE_API_BASE_URL=...` for a full explicit override
- `DHANPE_LOCAL_API_BASE_URL=...`
- `DHANPE_ANDROID_EMULATOR_API_BASE_URL=...`
- `DHANPE_PRODUCTION_API_BASE_URL=...`
- `DHANPE_CASHFREE_ENV=sandbox|production`

## Current Flow

1. Login or signup through `/api/auth/*`
2. Load profile with `/api/users/profile`
3. Request a Didit session through `/api/users/kyc/session`
4. Complete native identity verification in the Didit SDK
5. Sync the final session through `/api/users/kyc/session/:sessionId/sync`
6. Create a bill payment request through `/api/transfer`
7. Track lifecycle state through `/api/transaction/:id`

## Structure

```text
lib/
  main.dart
  config/
  core/
  models/
  providers/
  screens/
  services/
```

Important files:

- `lib/config/config.dart`: API target resolution
- `lib/core/app_theme.dart`: shared Everyday Utility design tokens/theme
- `lib/screens/dashboard/dashboard_screen.dart`: redesigned dashboard
- `lib/screens/payment/payment_screen.dart`: payment creation + compliance disclosure and confirmation
- `lib/screens/payment/payment_status_screen.dart`: settlement lifecycle timeline and edge-state messaging
- `lib/screens/profile/kyc_screen.dart`: KYC status and verification guidance
- `lib/widgets/legal_links.dart`: Terms, Privacy, Refund Policy, and support entry points

## Compliance Messaging Baseline

The app UI should consistently describe the flow as bill payment and settlement, not cash withdrawal.

Required user-facing disclosures before confirmation:

- processing time expectation (for example, T+1 in most cases)
- fees breakdown
- non-reversibility warning after processing begins
- explicit statement: "This is a bill payment flow, not a cash withdrawal."

Trust and policy elements surfaced in app:

- KYC status and verification prompts
- secure payment indicators
- transaction status timeline updates
- legal links available from signup and settings/profile surfaces

## Validation

```bash
flutter analyze
flutter test
```

Current known analyzer warnings outside the new UI flow:

- `lib/providers/auth_provider.dart`: unused `_refreshToken`
- `lib/services/http_client.dart`: debug `print` calls

## Native Setup Notes

- Android: the Didit packaging override lives in [android/app/build.gradle.kts](/d:/Personal%20Data/dhanPe-local/dhanPe/frontend/android/app/build.gradle.kts).
- iOS: this repository currently does not contain a `frontend/ios/` target, so the Didit Podfile change can only be applied after adding the iOS platform to the Flutter project.
