# DhanPe API Testing Guide

## 🧪 Testing the Payment Flow

### Prerequisites
- Backend running: `npm run dev` (http://localhost:3000)
- PostgreSQL running
- Postman or curl installed

---

## 1️⃣ User Registration

### Create User Account

**Endpoint:** `POST http://localhost:3000/api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Save the tokens for next requests.**

---

## 2️⃣ User Login

**Endpoint:** `POST http://localhost:3000/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## 3️⃣ Get User Profile

**Endpoint:** `GET http://localhost:3000/api/users/profile`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": null,
    "kycStatus": "PENDING",
    "balance": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 4️⃣ Create Payment Order

**Endpoint:** `POST http://localhost:3000/api/payments/create-order`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 100,
  "description": "Test payment for DhanPe"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "pay_123",
    "orderToken": "cf_order_token_abc...",
    "orderId": "cf_order_1234567890",
    "amount": 100,
    "status": "PENDING",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Save the payment ID and order ID for next steps.**

---

## 5️⃣ Simulate Cashfree Webhook (Testing)

**Endpoint:** `POST http://localhost:3000/api/payments/webhook`

**Headers:**
```
Content-Type: application/json
X-Cashfree-Signature: <signature_hash>
```

**Request Body:**
```json
{
  "order_id": "cf_order_1234567890",
  "order_status": "PAID",
  "payment_method": "CARD",
  "payment_amount": 100,
  "payment_currency": "INR",
  "payment_utr": "test_utr_123",
  "order_token": "cf_order_token_abc...",
  "cf_payment_id": "cf_pay_123",
  "timestamp": "2024-01-15T10:36:00.000Z"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Note:** In production, Cashfree will call this endpoint automatically after payment.

---

## 6️⃣ Get Payment Status

**Endpoint:** `GET http://localhost:3000/api/payments/status/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Example:** `GET http://localhost:3000/api/payments/status/pay_123`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pay_123",
    "orderId": "cf_order_1234567890",
    "amount": 100,
    "status": "SUCCESS",
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:36:00.000Z"
  }
}
```

---

## 7️⃣ Get Transaction History

**Endpoint:** `GET http://localhost:3000/api/transactions`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Query Parameters:**
```
?limit=20&offset=0&status=SUCCESS&type=CREDIT
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_123",
        "type": "CREDIT",
        "amount": 100,
        "status": "SUCCESS",
        "description": "Payment successful",
        "createdAt": "2024-01-15T10:36:00.000Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 8️⃣ Refresh Access Token

**Endpoint:** `POST http://localhost:3000/api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## 9️⃣ Logout

**Endpoint:** `POST http://localhost:3000/api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🔄 Complete Test Sequence (Bash Script)

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
EMAIL="test$(date +%s)@example.com"
PASSWORD="TestPass123"
FIRST_NAME="Test"
LAST_NAME="User"
AMOUNT=100

echo "=== DhanPe API Test Sequence ==="

# 1. Signup
echo "1️⃣ Signing up..."
SIGNUP=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\"
  }")

TOKEN=$(echo $SIGNUP | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH=$(echo $SIGNUP | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)

echo "✅ User created: $USER_ID"
echo "✅ Access token: ${TOKEN:0:20}..."

# 2. Get Profile
echo ""
echo "2️⃣ Getting user profile..."
curl -s -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Create Payment
echo ""
echo "3️⃣ Creating payment order..."
PAYMENT=$(curl -s -X POST "$BASE_URL/payments/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"description\": \"Test payment\"
  }")

PAYMENT_ID=$(echo $PAYMENT | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
ORDER_ID=$(echo $PAYMENT | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

echo "✅ Payment created: $PAYMENT_ID"
echo "✅ Order ID: $ORDER_ID"

# 4. Simulate Webhook
echo ""
echo "4️⃣ Simulating Cashfree webhook..."
curl -s -X POST "$BASE_URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"order_status\": \"PAID\",
    \"payment_method\": \"CARD\",
    \"payment_amount\": $AMOUNT,
    \"payment_currency\": \"INR\",
    \"cf_payment_id\": \"cf_pay_123\"
  }" | jq .

# 5. Check Payment Status
echo ""
echo "5️⃣ Checking payment status..."
curl -s -X GET "$BASE_URL/payments/status/$PAYMENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 6. Get Transactions
echo ""
echo "6️⃣ Getting transaction history..."
curl -s -X GET "$BASE_URL/transactions?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "✅ Test sequence completed!"
```

---

## ⚠️ Error Responses

### 400 - Validation Error
```json
{
  "success": false,
  "message": "Validation failed: email: Invalid email address",
  "code": "VALIDATION_ERROR"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "code": "AUTHENTICATION_ERROR"
}
```

### 409 - Conflict (Email already exists)
```json
{
  "success": false,
  "message": "User with this email already exists",
  "code": "CONFLICT"
}
```

### 429 - Rate Limit
```json
{
  "success": false,
  "message": "Too many payment requests, please try again later"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "code": "INTERNAL_SERVER_ERROR"
}
```

---

## 🔐 Testing Webhook Signature (Optional)

If you want to test signature validation:

```bash
# Generate HMAC-SHA256 signature
WEBHOOK_SECRET="your-webhook-secret"
PAYLOAD='{"order_id":"cf_order_123","order_status":"PAID"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# Include signature header
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Cashfree-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## 📊 Postman Collection

Import this into Postman:

```json
{
  "info": {
    "name": "DhanPe API",
    "description": "Payment Application API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Signup",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/signup",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"user@example.com\", \"password\": \"SecurePassword123\"}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"user@example.com\", \"password\": \"SecurePassword123\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Payments",
      "item": [
        {
          "name": "Create Order",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/payments/create-order",
            "header": [
              {"key": "Authorization", "value": "Bearer {{accessToken}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"amount\": 100, \"description\": \"Test payment\"}"
            }
          }
        },
        {
          "name": "Get Status",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/payments/status/{{paymentId}}",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}]
          }
        }
      ]
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000/api"},
    {"key": "accessToken", "value": ""},
    {"key": "paymentId", "value": ""}
  ]
}
```

---

## 🚀 Quick Test Commands

```bash
# Test server is up
curl http://localhost:3000/health

# Create user and login in one go
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","firstName":"Test","lastName":"User"}'

# Check if database is connected
npm run db:migrate
```

---

Happy testing! 🎉
