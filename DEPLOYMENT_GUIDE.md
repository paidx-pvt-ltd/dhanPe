# DhanPe - Deployment & Setup Guide

## Complete Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Flutter 3.0+
- Git
- Docker (optional, for containerization)

---

## Backend Setup (Node.js)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb dhanpe

# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/dhanpe

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 3. Environment Configuration
```bash
cp .env.example .env

# Edit .env with:
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CASHFREE_CLIENT_ID=your_cashfree_id
CASHFREE_CLIENT_SECRET=your_cashfree_secret
WEBHOOK_SECRET=your-webhook-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dhanpe
```

### 4. Start Development Server
```bash
npm run dev

# Server runs on http://localhost:3000
```

### 5. Testing
```bash
npm test
```

---

## Frontend Setup (Flutter)

### 1. Install Flutter
```bash
# Download from https://flutter.dev/docs/get-started/install
flutter doctor
```

### 2. Setup Project
```bash
cd frontend
flutter pub get
```

### 3. Configure Backend URL
Edit `lib/config/config.dart`:
```dart
static const String baseUrl = 'http://localhost:3000/api';  // or your server IP
```

### 4. Run App
```bash
# Check devices
flutter devices

# Run on device/emulator
flutter run

# Build APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

---

## Database Schema

### Key Tables
1. **Users** - User accounts, passwords, KYC status
2. **Payments** - Payment orders and status
3. **Transactions** - Financial transactions (debits/credits)
4. **RefreshTokens** - For token refresh mechanism
5. **WebhookLogs** - For webhook debugging

All tables have indexes on frequently queried fields.

---

## API Endpoints

### Authentication
```
POST   /api/auth/signup          # Register user
POST   /api/auth/login           # Login user
POST   /api/auth/refresh         # Refresh token
POST   /api/auth/logout          # Logout
```

### Users
```
GET    /api/users/profile        # Get profile (auth required)
PATCH  /api/users/profile        # Update profile (auth required)
GET    /api/users/balance        # Get balance (auth required)
```

### Payments
```
POST   /api/payments/create-order      # Create payment (auth required)
GET    /api/payments/status/:id        # Get payment status (auth required)
GET    /api/payments/history           # Get history (auth required)
POST   /api/payments/webhook           # Webhook from Cashfree (public)
```

### Transactions
```
GET    /api/transactions             # List transactions (auth required)
GET    /api/transactions/:id         # Get transaction (auth required)
```

---

## Security Checklist

✅ **HTTPS** - Enable SSL/TLS in production
✅ **Environment Variables** - Never commit secrets
✅ **Password Hashing** - bcrypt with 10 rounds
✅ **JWT Expiry** - Short-lived access tokens (1h)
✅ **Rate Limiting** - Enabled on auth & payment endpoints
✅ **CORS** - Configured for frontend domain
✅ **Input Validation** - Zod schema validation
✅ **Webhook Verification** - Signature validation from Cashfree
✅ **Idempotency** - Duplicate webhook protection
✅ **Logging** - Structured logging with Pino

---

## Cashfree Integration

### Test Mode Configuration
1. Sign up at: https://merchant.cashfree.com/sandbox
2. Get credentials from dashboard
3. Add to `.env`:
```env
CASHFREE_CLIENT_ID=your_sandbox_id
CASHFREE_CLIENT_SECRET=your_sandbox_secret
CASHFREE_API_BASE_URL=https://sandbox.cashfree.com/pg
```

### Webhook Setup
1. Configure webhook URL in Cashfree dashboard:
   ```
   https://your-domain.com/api/payments/webhook
   ```
2. Webhook signature is verified in backend
3. Implements idempotency for duplicate webhooks

### Payment Flow
1. Frontend creates order via `/api/payments/create-order`
2. Backend calls Cashfree API
3. Returns order token to frontend
4. Frontend shows Cashfree checkout
5. User completes payment
6. Cashfree calls backend webhook
7. Backend updates database
8. Frontend polls status and shows result

---

## Production Deployment

### AWS EC2 + RDS

#### 1. EC2 Setup
```bash
# SSH to EC2 instance
ssh -i key.pem ec2-user@instance-ip

# Install Node & PostgreSQL client
sudo yum update && sudo yum install nodejs postgresql

# Clone repository
git clone <your-repo>
cd backend

# Install dependencies
npm install

# Build
npm run build
```

#### 2. Environment Setup
```bash
# Copy .env to server and configure with production values
scp -i key.pem .env ec2-user@instance-ip:/app/.env

# Run migrations
npm run db:migrate
```

#### 3. Run with PM2
```bash
npm install -g pm2

# Start app
pm2 start npm --name "dhanpe" -- start

# Enable auto-restart
pm2 startup
pm2 save
```

#### 4. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. SSL Certificate
```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renew
sudo systemctl enable certbot-renew.timer
```

#### 6. Database (RDS)
```bash
# In RDS console:
# 1. Create DB instance (PostgreSQL 14)
# 2. Configure security group to allow EC2
# 3. Update DATABASE_URL in .env
```

### Github Actions CI/CD

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci --prefix backend
      
      - name: Lint
        run: npm run lint --prefix backend
      
      - name: Test
        run: npm test --prefix backend
      
      - name: Build
        run: npm run build --prefix backend
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_KEY }}
          script: |
            cd /app
            git pull
            npm ci
            npm run build
            npm run db:migrate
            pm2 restart dhanpe
```

---

## Monitoring & Logging

### Backend Logs
```bash
# Check logs
tail -f logs/app.log

# With PM2
pm2 logs dhanpe

# With Pino
NODE_ENV=production npm start | node_modules/.bin/pino-pretty
```

### Error Tracking
- Firebase Crashlytics for mobile
- Sentry for backend (optional)
- Datadog for infrastructure

### Database Monitoring
- AWS RDS CloudWatch metrics
- Query performance logs
- Backup status

---

## Testing Checklist

### Manual Testing
- [ ] User signup/login
- [ ] Create test payment (₹1 in Cashfree sandbox)
- [ ] Check webhook received
- [ ] Verify transaction recorded
- [ ] Check transaction history
- [ ] Test token refresh
- [ ] Test rate limiting

### Automated Testing
- [ ] All unit tests pass: `npm test`
- [ ] All lint checks pass: `npm run lint`
- [ ] API integration tests pass

---

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL
psql -U postgres -d dhanpe

# Check connection string in .env
DATABASE_URL=postgresql://user:password@localhost:5432/dhanpe
```

### JWT Token Issues
- Set strong `JWT_SECRET` in .env
- Check token expiry: `JWT_EXPIRY=1h`
- Implement refresh token flow

### Cashfree Webhook Not Received
- Verify webhook URL is public HTTPS
- Check webhook signature verification
- Review Cashfree dashboard logs
- Implement retry logic

### Payment Status Not Updating
- Check webhook logs in database
- Verify Cashfree API credentials
- Check firewall rules for webhook inbound

---

## Scaling Considerations

For production scaling:

1. **Database** - Add read replicas, schedule backups
2. **Caching** - Redis for frequent queries
3. **API** - Load balancer (ALB/Classic)
4. **Monitoring** - CloudWatch/Datadog alerts
5. **Security** - WAF, DDoS protection
6. **CDN** - CloudFront for static assets

---

## Support Resources

- Backend API: `backend/README.md`
- Flutter App: `frontend/README.md`
- Cashfree Docs: https://docs.cashfree.com
- Express.js: https://expressjs.com
- Prisma: https://www.prisma.io
- Flutter: https://flutter.dev
