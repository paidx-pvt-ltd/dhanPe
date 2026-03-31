export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'DhanPe Fintech Backend',
    version: '2.0.0',
    description: 'Transfer, webhook verification, payout, transaction and ledger APIs.',
  },
  paths: {
    '/transfer': {
      post: {
        summary: 'Create transfer transaction and Cashfree order',
      },
    },
    '/webhook/cashfree': {
      post: {
        summary: 'Cashfree payment webhook',
      },
    },
    '/transaction/{id}': {
      get: {
        summary: 'Get transaction lifecycle',
      },
    },
  },
};
