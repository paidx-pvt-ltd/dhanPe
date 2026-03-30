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

  /**
   * Create order in Cashfree
   */
  static async createOrder(
    request: CashfreeOrderRequest
  ): Promise<CashfreeOrderResponse> {
    try {
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
