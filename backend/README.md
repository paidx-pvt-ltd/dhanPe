# DhanPe Backend

A secure, production-ready payment backend built with Node.js, TypeScript, and Express.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create PostgreSQL database**
   ```bash
   createdb dhanpe
   ```

4. **Run migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost/dhanpe
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRY=7d
CASHFREE_CLIENT_ID=your-client-id
CASHFREE_CLIENT_SECRET=your-client-secret
WEBHOOK_SECRET=your-webhook-secret
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `GET /api/users/balance` - Get user balance

### Payments
- `POST /api/payments/create-order` - Create payment order
- `GET /api/payments/status/:id` - Get payment status
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/webhook` - Cashfree webhook (public)

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details

## Security Features

✅ **HTTPS Ready** - Helmet for security headers
✅ **JWT Authentication** - Access & refresh tokens
✅ **Password Hashing** - bcrypt with 10 salt rounds
✅ **Rate Limiting** - Per-endpoint rate limits
✅ **Input Validation** - Zod schema validation
✅ **Webhook Signature Verification** - Verify Cashfree webhooks
✅ **Idempotency** - Duplicate webhook protection
✅ **CORS** - Configurable origin protection
✅ **SQL Injection Prevention** - Prisma ORM

## Database Schema

### Users
- id, email, passwordHash, firstName, lastName, phoneNumber
- kycStatus, kycDocumentUrl, balance
- created/updated timestamps

### Payments
- id, userId, cashfreeOrderId, amount, status
- webhookReceived, webhookData
- Statuses: PENDING, SUCCESS, FAILED, CANCELLED

### Transactions
- id, userId, paymentId, type, amount, status
- idempotencyKey (for webhook deduplication)
- Types: DEBIT, CREDIT, REFUND

### RefreshTokens
- token, expiresAt, revokedAt

### WebhookLogs
- event, source, data, processed, error

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

## Scripts

```bash
npm run dev          # Start dev server with watch
npm run build        # Build TypeScript to JS
npm start            # Run compiled server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm test             # Run tests
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
```

## Payment Flow

1. **Frontend** calls `/api/payments/create-order`
2. **Backend** creates order in Cashfree
3. **Frontend** shows Cashfree checkout
4. **User** completes payment
5. **Cashfree** calls webhook `/api/payments/webhook`
6. **Backend** verifies and updates payment status
7. **Backend** creates transaction record
8. **Frontend** polls `/api/payments/status/:id`

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

## Logging

Uses Pino for structured logging. Configure level in `.env`:

```env
LOG_LEVEL=info  # debug, info, warn, error
```

## Production Deployment

1. Build the app: `npm run build`
2. Install production dependencies: `npm ci --production`
3. Set secure environment variables in your hosting platform
4. Run: `npm start`
5. Use process manager (PM2, systemd) for auto-restart
6. Enable HTTPS via reverse proxy (nginx, CloudFront)
7. Monitor logs and errors

## Development

- **Hot reload**: `npm run dev` watches source files
- **Linting**: `npm run lint` before committing
- **Type checking**: TypeScript strict mode enabled
- **Formatting**: `npm run format` for consistency

## Support

For issues or questions, check:
- Database migrations: `prisma/migrations/`
- Schema: `prisma/schema.prisma`
- Examples: `src/tests/`
