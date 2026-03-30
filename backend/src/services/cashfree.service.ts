import axios from 'axios';
import { config } from '../config';
import { logger } from '../config/logger';

export interface CashfreeOrderRequest {
  order_amount: number;
  order_currency: string;
  order_note: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta?: {
    return_url?: string;
    notify_url?: string;
  };
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_token: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
  customer_id: string;
  created_at: string;
}

export class CashfreeService {
  private static client = axios.create({
    baseURL: config.cashfree.baseUrl,
    headers: {
      'x-api-version': '2023-08-01',
      'x-client-id': config.cashfree.clientId,
      'x-client-secret': config.cashfree.clientSecret,
    },
  });

  // Check if using placeholder credentials (mock mode)
  private static isMockMode(): boolean {
    return (
      config.cashfree.clientId.includes('your_cashfree') ||
      config.cashfree.clientSecret.includes('your_cashfree')
    );
  }

  /**
   * Create order in Cashfree
   */
  static async createOrder(
    request: CashfreeOrderRequest
  ): Promise<CashfreeOrderResponse> {
    try {
      // Mock mode for development/testing
      if (this.isMockMode()) {
        logger.info('📌 MOCK MODE: Returning test response (use real credentials in .env to enable live)');
        return {
          cf_order_id: Math.random().toString(36).substring(7),
          order_id: request.customer_details.customer_id + '_' + Date.now(),
          order_token: 'test_token_' + Math.random().toString(36).substring(7),
          order_status: 'ACTIVE',
          order_amount: request.order_amount,
          order_currency: request.order_currency,
          customer_id: request.customer_details.customer_id,
          created_at: new Date().toISOString(),
        };
      }

      const response = await this.client.post<CashfreeOrderResponse>(
        '/orders',
        request
      );

      logger.info(`Order created in Cashfree: ${response.data.cf_order_id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Cashfree order:', error);
      throw error;
    }
  }

  /**
   * Get order status from Cashfree
   */
  static async getOrderStatus(orderId: string) {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get order status for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Verify payment in Cashfree
   */
  static async verifyPayment(paymentId: string) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to verify payment ${paymentId}:`, error);
      throw error;
    }
  }
}
