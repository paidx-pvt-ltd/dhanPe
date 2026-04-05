# DhanPe Frontend

Flutter app for the Everyday Utility transfer flow: dashboard, transfer setup, card verification, identity step, review, and success tracking.

## Quick Start

```bash
cd frontend
flutter pub get
flutter run
```

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

## Current Flow

1. Login or signup through `/api/auth/*`
2. Load profile with `/api/users/profile`
3. Complete in-app identity step through `/api/users/kyc/complete`
4. Create transfer through `/api/transfer`
5. View transfer state through `/api/transaction/:id`

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
- `lib/screens/payment/payment_screen.dart`: multi-step transfer flow
- `lib/screens/payment/payment_status_screen.dart`: success/status tracker

## Validation

```bash
flutter analyze
flutter test
```

Current known analyzer warnings outside the new UI flow:

- `lib/providers/auth_provider.dart`: unused `_refreshToken`
- `lib/services/http_client.dart`: debug `print` calls
