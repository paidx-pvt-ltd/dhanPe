# 💳 DhanPe - Payment Application MVP

A production-ready mobile payment application MVP built with **Flutter** (frontend) and **Node.js/TypeScript** (backend), integrated with **Cashfree Payments**.

## 🎯 Project Overview

DhanPe is a secure payment application that demonstrates:
- ✅ Secure user authentication (JWT)
- ✅ Payment processing via Cashfree
- ✅ Real-time payment status updates
- ✅ Transaction history & ledger
- ✅ Production-ready architecture
- ✅ Comprehensive security practices

## 📱 Tech Stack

```
Frontend:     Flutter (Dart) + Provider
Backend:      Node.js + TypeScript + Express
Database:     PostgreSQL
Payments:     Cashfree Payments API
Storage:      AWS S3 (ready)
Hosting:      AWS (EC2 + RDS)
```

## 📂 Project Structure

```
dhanPe/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── middlewares/    # Auth, validation, etc
│   │   ├── utils/          # Helpers, JWT, crypto
│   │   ├── index.ts        # Entry point
│   │   └── tests/          # Unit tests
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # DB migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                # Flutter app
│   ├── lib/
│   │   ├── config/         # App configuration
│   │   ├── models/         # Data models
│   │   ├── services/       # API services
│   │   ├── providers/      # State management
│   │   ├── screens/        # UI screens
│   │   ├── core/           # Core utilities
│   │   ├── main.dart       # Entry point
│   │   └── routing.dart    # Navigation
│   ├── pubspec.yaml
│   └── README.md
│
├── DEPLOYMENT_GUIDE.md     # Production deployment
├── README.md               # This file
└── .gitignore
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup PostgreSQL
createdb dhanpe

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npm run db:migrate

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

### Frontend Setup

```bash
cd frontend

# Get Flutter packages
flutter pub get

# Update API URL in lib/config/config.dart
# static const String baseUrl = 'http://localhost:3000/api';

# Run app
flutter run
```

## 🔐 Security Features

| Feature | Implementation |
|---------|-----------------|
| **Authentication** | JWT with short-lived tokens + refresh tokens |
| **Password Security** | bcrypt hashing (10 salt rounds) |
| **API Security** | Rate limiting, CORS, Helmet.js |
| **Input Validation** | Zod schema validation |
| **Secure Storage** | Flutter Secure Storage for tokens |
| **Webhook Verification** | HMAC-SHA256 signature validation |
| **Idempotency** | Duplicate webhook protection |
| **HTTPS** | Ready for production HTTPS/SSL |
| **Logging** | Structured logging with Pino |

## 📋 API Endpoints

### Authentication
```
POST   /api/auth/signup              Register new user
POST   /api/auth/login               Login user
POST   /api/auth/refresh             Refresh access token
POST   /api/auth/logout              Logout user
```

### User Management
```
GET    /api/users/profile            Get user profile (auth required)
PATCH  /api/users/profile            Update profile (auth required)
GET    /api/users/balance            Get user balance (auth required)
```

### Payments
```
POST   /api/payments/create-order    Create payment order (auth required)
GET    /api/payments/status/:id      Get payment status (auth required)
GET    /api/payments/history         Get payment history (auth required)
POST   /api/payments/webhook         Cashfree webhook (public, signed)
```

### Transactions
```
GET    /api/transactions             List transactions (auth required)
GET    /api/transactions/:id         Get transaction details (auth required)
```

## 💼 Payment Flow

```
1. User Creates Payment
   └─ Frontend: /api/payments/create-order
   └─ Backend: Creates order in database + Cashfree API
   └─ Returns: Order token for checkout

2. User Pays
   └─ Frontend: Opens Cashfree checkout with order token
   └─ User: Completes payment via Cashfree

3. Payment Webhook
   └─ Cashfree: Calls /api/payments/webhook
   └─ Backend: Verifies signature
   └─ Backend: Updates payment status in DB
   └─ Backend: Creates transaction record

4. Frontend Confirmation
   └─ Frontend: Polls /api/payments/status/:id
   └─ Frontend: Shows success/failure status
   └─ User: Sees transaction in history
```

## 🗄️ Database Schema

### Core Tables

**Users**
- id, email, passwordHash
- firstName, lastName, phoneNumber
- kycStatus, kycDocumentUrl
- balance, createdAt, updatedAt, isActive

**Payments**
- id, userId, cashfreeOrderId
- amount, currency, status
- webhookReceived, webhookData
- createdAt, updatedAt

**Transactions**
- id, userId, paymentId
- type (DEBIT/CREDIT/REFUND)
- amount, status
- idempotencyKey (for deduplication)
- createdAt, updatedAt

**RefreshTokens**
- id, userId, token, expiresAt, revokedAt

**WebhookLogs**
- id, event, source, data, processed, error

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Test Coverage
- ✅ Auth module (signup, login, refresh)
- ✅ Payment creation & status
- ✅ Webhook idempotency
- ✅ Input validation
- ✅ Error handling

### Testing Payment Locally

```bash
# 1. Create payment via API
POST /api/payments/create-order
Authorization: Bearer <token>
{
  "amount": 100,
  "description": "Test payment"
}

# Response:
{
  "id": "pay_123",
  "orderId": "cf_order_123",
  "orderToken": "token_abc",
  "amount": 100,
  "status": "PENDING"
}

# 2. Simulate webhook
POST /api/payments/webhook
{
  "order_id": "cf_order_123", 
  "order_status": "PAID",
  ...other fields
}

# 3. Check status
GET /api/payments/status/pay_123
Authorization: Bearer <token>
```

## 📦 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dhanpe
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRY=7d
CASHFREE_CLIENT_ID=cf_client_id
CASHFREE_CLIENT_SECRET=cf_client_secret
CASHFREE_API_BASE_URL=https://sandbox.cashfree.com/pg
WEBHOOK_SECRET=webhook_secret
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

### Frontend (lib/config/config.dart)
```dart
static const String baseUrl = 'http://localhost:3000/api';
static const String cashfreeClientId = 'YOUR_CASHFREE_CLIENT_ID';
static const String cashfreeAppId = 'YOUR_CASHFREE_APP_ID';
static const bool isCashfreeSandbox = true;
```

## 🔄 Key Implementation Details

### JWT Tokens
- **Access Token**: Short-lived (1 hour), used for API auth
- **Refresh Token**: Long-lived (7 days), stored securely
- Auto-refresh flow on 401 responses

### Cashfree Integration
- Uses Cashfree SDK/Web for payment checkout
- Webhook signature validation with HMAC-SHA256
- Sandbox mode for testing

### Idempotency
- Prevents duplicate transaction creation
- Uses `idempotencyKey` hash from payment + webhook data
- Automatically handles webhook retries

### Rate Limiting
- Auth endpoints: 5 requests/15 minutes
- Payment endpoints: 10 requests/hour
- General API: 100 requests/15 minutes

## 📚 Documentation

- **Backend Guide**: See [backend/README.md](backend/README.md)
- **Frontend Guide**: See [frontend/README.md](frontend/README.md)
- **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **API Docs**: Postman collection (see examples below)

## 🚀 Production Checklist

- [ ] Set secure JWT secrets in production
- [ ] Configure HTTPS/SSL certificates
- [ ] Setup AWS RDS PostgreSQL database
- [ ] Configure Cashfree production credentials
- [ ] Setup webhook signature verification
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain
- [ ] Setup monitoring & logging
- [ ] Run performance tests
- [ ] Security audit (OWASP Top 10)
- [ ] Database backups configured
- [ ] Email notifications setup

## 🛠️ Scripts

### Backend
```bash
npm run dev              # Start dev server
npm run build            # Build TypeScript
npm start                # Run compiled app
npm test                 # Run tests
npm run lint             # Lint code
npm run format           # Format with Prettier
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
```

### Frontend
```bash
flutter pub get          # Get dependencies
flutter run              # Run app
flutter build apk        # Build Android APK
flutter build ios        # Build iOS app
flutter test             # Run tests
flutter analyze          # Analyze code
```

## 🐛 Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection error**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Run migrations: `npm run db:migrate`

**Flutter connection refused**
- Backend must be running: `npm run dev`
- Check baseUrl in `lib/config/config.dart`
- Use `10.0.2.2` for Android emulator localhost

**Token expired**
- Implement refresh token flow
- Check JWT_EXPIRY setting
- Verify refresh token stored correctly

## 📞 Support

For issues or questions:
1. Check relevant README (backend/frontend)
2. Review DEPLOYMENT_GUIDE.md
3. Check GitHub issues
4. Review API documentation

## 📄 License

This project is provided as-is for educational and development purposes.

## 🎓 Learning Path

1. **Understand Architecture**: Review system architecture diagram
2. **Setup Backend**: Follow backend README
3. **Setup Frontend**: Follow frontend README
4. **Test Locally**: Use Postman for API testing
5. **Deploy**: Follow DEPLOYMENT_GUIDE
6. **Monitor**: Setup logging & error tracking
7. **Scale**: Implement caching, load balancing

## 🔗 Useful Links

- [Cashfree Docs](https://docs.cashfree.com)
- [Express.js](https://expressjs.com)
- [Prisma ORM](https://www.prisma.io)
- [Flutter](https://flutter.dev)
- [PostgreSQL](https://www.postgresql.org)
- [JWT](https://jwt.io)

---

**Built with ❤️ for secure payments.**
