export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'DhanPe Fintech Backend',
    version: '2.0.0',
    description:
      'Auth, onboarding, transfer, webhook verification, payout, transaction, dispute, refund and reconciliation APIs.',
  },
  paths: {
    '/api/auth/widget-config': {
      get: {
        summary: 'Get public MSG91 widget configuration',
      },
    },
    '/api/auth/verify-widget': {
      post: {
        summary: 'Verify MSG91 widget access token and issue JWT tokens',
      },
    },
    '/api/auth/send-otp': {
      post: {
        summary: 'Send mobile OTP through MSG91',
      },
    },
    '/api/auth/verify-otp': {
      post: {
        summary: 'Verify mobile OTP and issue JWT tokens',
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and issue a new access token',
      },
    },
    '/api/users/onboarding': {
      get: {
        summary: 'Get authenticated user onboarding status',
      },
    },
    '/api/users/profile': {
      get: {
        summary: 'Get authenticated user profile',
      },
      patch: {
        summary: 'Update authenticated user profile',
      },
    },
    '/api/users/pan': {
      post: {
        summary: 'Verify PAN through Cashfree',
      },
    },
    '/api/users/pan/fallback': {
      post: {
        summary: 'Create Didit PAN document verification fallback session',
      },
    },
    '/api/users/beneficiaries': {
      get: {
        summary: 'List authenticated user beneficiaries',
      },
      post: {
        summary: 'Validate and register a payout-ready beneficiary',
      },
    },
    '/api/users/kyc/session': {
      post: {
        summary: 'Create a Didit verification session for the authenticated user',
      },
    },
    '/api/users/kyc/session/{sessionId}/sync': {
      post: {
        summary: 'Fetch the latest Didit session status and sync the authenticated user KYC status',
      },
    },
    '/api/transfer': {
      post: {
        summary: 'Create transfer transaction and Cashfree order',
      },
    },
    '/api/transaction': {
      get: {
        summary: 'List authenticated user transactions',
      },
    },
    '/api/transaction/{id}': {
      get: {
        summary: 'Get transaction lifecycle',
      },
    },
    '/api/payout/{transactionId}/sync': {
      post: {
        summary: 'Queue payout status sync for a transaction',
      },
    },
    '/api/refund/{transactionId}': {
      post: {
        summary: 'Create refund for a transaction',
      },
    },
    '/api/refund/{refundId}/sync': {
      post: {
        summary: 'Queue refund status sync',
      },
    },
    '/api/disputes': {
      post: {
        summary: 'Create an admin dispute or chargeback case',
      },
      get: {
        summary: 'List admin dispute or chargeback cases',
      },
    },
    '/api/disputes/{disputeId}': {
      get: {
        summary: 'Get admin dispute or chargeback case details',
      },
    },
    '/api/disputes/{disputeId}/respond': {
      post: {
        summary: 'Mark admin dispute response details',
      },
    },
    '/api/disputes/{disputeId}/resolve': {
      post: {
        summary: 'Resolve an admin dispute or chargeback case',
      },
    },
    '/api/reconciliation/run': {
      post: {
        summary: 'Start an admin reconciliation run',
      },
    },
    '/api/reconciliation/runs/{runId}': {
      get: {
        summary: 'Get reconciliation run details',
      },
    },
    '/api/reconciliation/items': {
      get: {
        summary: 'List reconciliation items',
      },
    },
    '/api/reconciliation/items/{itemId}/resolve': {
      post: {
        summary: 'Resolve a reconciliation item',
      },
    },
    '/api/webhook/cashfree': {
      post: {
        summary: 'Cashfree payment webhook',
      },
    },
    '/api/webhook/cashfree/payout': {
      post: {
        summary: 'Cashfree payout webhook',
      },
    },
    '/api/webhook/didit': {
      post: {
        summary: 'Didit verification webhook',
      },
    },
  },
};
