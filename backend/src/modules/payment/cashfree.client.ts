import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError } from '../../shared/errors.js';
import {
  CashfreeOrderRequest,
  CashfreeOrderResponse,
  CashfreePayoutRequest,
  CashfreePayoutResponse,
} from './payment.types.js';

export class CashfreeClient {
  private readonly orderClient: AxiosInstance;
  private readonly payoutClient: AxiosInstance;

  constructor() {
    const headers = {
      'x-client-id': config.cashfree.clientId,
      'x-client-secret': config.cashfree.clientSecret,
      'x-api-version': '2023-08-01',
    };

    this.orderClient = axios.create({
      baseURL: config.cashfree.baseUrl,
      headers,
      timeout: 10000,
    });

    this.payoutClient = axios.create({
      baseURL: config.cashfree.payoutBaseUrl,
      headers,
      timeout: 10000,
    });
  }

  async createOrder(payload: CashfreeOrderRequest): Promise<CashfreeOrderResponse> {
    try {
      const { data } = await this.orderClient.post<CashfreeOrderResponse>('/pg/orders', payload);
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to create Cashfree order', error);
    }
  }

  async createPayout(payload: CashfreePayoutRequest): Promise<CashfreePayoutResponse> {
    try {
      const { data } = await this.payoutClient.post<CashfreePayoutResponse>(
        '/payout/transfers',
        payload
      );
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to create Cashfree payout', error);
    }
  }
}
