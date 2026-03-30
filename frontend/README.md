# DhanPe Mobile App

A secure Flutter mobile payment application with JWT authentication and Cashfree payment integration.

## Features

✅ **User Authentication** - Sign up, login with JWT tokens
✅ **Secure Storage** - Store tokens in secure storage
✅ **Payment Processing** - Create orders via Cashfree
✅ **Transaction History** - View all transactions
✅ **User Dashboard** - See balance and profile
✅ **Real-time Status** - Check payment status with polling

## Prerequisites

- Flutter 3.0+
- Dart 3.0+
- Android SDK 21+ or iOS 11+
- Visual Studio Code or Android Studio

## Setup

### 1. Install Flutter
```bash
# Download from: https://flutter.dev/docs/get-started/install
flutter doctor
```

### 2. Clone and Setup Project
```bash
cd frontend
flutter pub get
```

### 3. Configure Environment
Edit `lib/config/config.dart`:
```dart
static const String baseUrl = 'http://192.168.x.x:3000/api';
static const String cashfreeClientId = 'YOUR_CLIENT_ID';
static const String cashfreeAppId = 'YOUR_APP_ID';
```

### 4. Run App
```bash
# On emulator
flutter emulators --launch <emulator_id>

# Run app
flutter run

# Build APK
flutter build apk --release

# Build for iOS
flutter build ios --release
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── config/                   # Configuration files
├── models/                   # Data models (User, Payment, Transaction)
├── services/                 # API services
├── providers/                # State management (Provider)
├── screens/                  # UI Screens
│   ├── auth/                 # Login/Signup
│   ├── dashboard/            # Home dashboard
│   ├── payment/              # Payment flow
│   └── transactions/         # Transaction history
└── core/                     # Core utilities (exceptions, etc.)
```

## Key Services

### AuthService
- Handle login/signup
- Manage JWT tokens
- Refresh token logic

### PaymentService
- Create payment orders
- Check payment status
- Get payment history

### UserService
- Fetch user profile
- Get balance
- Update profile

### TransactionService
- List transactions
- Filter by type/status
- Get transaction details

## State Management (Provider)

- **AuthProvider** - Auth state & user session
- **UserProvider** - User profile & balance
- **PaymentProvider** - Current & historical payments

## Security Features

🔒 **Secure Storage** - Flutter Secure Storage for tokens
🔒 **Certificate Pinning** - HTTPS pinning ready
🔒 **JWT Validation** - Decode and validate tokens
🔒 **Token Refresh** - Auto-refresh expired tokens
🔒 **No Hardcoded Secrets** - Use environment files

## API Integration

All API calls go through:
1. `HttpClient` - Adds auth header & handles interceptors
2. Service Classes - Handle specific endpoints
3. Providers - Manage state updates

Example flow:
```dart
// From UI
context.read<AuthProvider>().login(email, password);

// Inside Provider
await _authService.login(email, password);

// Inside Service
await _dio.post('/auth/login', data)
```

## Testing

```bash
# Run unit tests
flutter test

# Run widget tests
flutter test test/widget_test.dart

# Run integration tests
flutter test integration_test/
```

## Common Issues

### Connection Refused
- Ensure backend is running: `npm run dev`
- Check IP address in config.dart
- Use `10.0.2.2` for Android emulator to access localhost

### Token Expired
- Tokens auto-refresh in `_onError` interceptor
- If refresh fails, user is logged out

### Payment Status Not Updating
- Dashboard auto-refreshes on pull-down
- Payment status screen polls every 5 seconds
- Check webhook logs on backend

## Deployment

### Android

1. Create keystore:
```bash
keytool -genkey -v -keystore ~/dhanpe-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias dhanpe
```

2. Configure signing in `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        keyAlias 'dhanpe'
        keyPassword '...'
        storeFile file('...')
        storePassword '...'
    }
}
```

3. Build release APK:
```bash
flutter build apk --release
flutter build appbundle --release  # For Play Store
```

### iOS

1. Open Xcode project:
```bash
open ios/Runner.xcworkspace
```

2. Configure signing in Xcode:
   - Set Team ID
   - Set Bundle Identifier
   - Configure provisioning profiles

3. Build:
```bash
flutter build ios --release
```

## Monitoring

- Check app logs: `flutter logs`
- Monitor network: Fiddler/Charles proxy
- Firebase Analytics for user tracking
- Firebase Crashlytics for error reporting

## Support

- Check `README.md` in backend directory
- Review API documentation
- Check Flutter docs: https://flutter.dev/docs
