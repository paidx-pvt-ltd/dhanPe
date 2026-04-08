import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError } from '../../shared/errors.js';
import {
  CashfreeBeneficiaryRequest,
  CashfreeBeneficiaryResponse,
  CashfreeOrderRequest,
  CashfreeOrderResponse,
  CashfreePayoutRequest,
  CashfreePayoutResponse,
  CashfreeTransferStatusResponse,
} from './payment.types.js';

export class CashfreeClient {
  private readonly orderClient: AxiosInstance;
  private readonly payoutClient: AxiosInstance;

  constructor() {
    const headers = {
      'x-client-id': config.cashfree.clientId,
      'x-client-secret': config.cashfree.clientSecret,
      'x-api-version': '2024-01-01',
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

  async getPayoutStatus(
    transferId: string,
    cfTransferId?: string
  ): Promise<CashfreeTransferStatusResponse> {
    try {
      const { data } = await this.payoutClient.get<CashfreeTransferStatusResponse>(
        '/payout/transfers',
        {
          params: {
            transfer_id: transferId,
            ...(cfTransferId ? { cf_transfer_id: cfTransferId } : {}),
          },
        }
      );
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to fetch Cashfree payout status', error);
    }
  }

  async createBeneficiary(
    payload: CashfreeBeneficiaryRequest
  ): Promise<CashfreeBeneficiaryResponse> {
    try {
      const { data } = await this.payoutClient.post<CashfreeBeneficiaryResponse>(
        '/payout/beneficiary',
        payload
      );
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to create Cashfree beneficiary', error);
    }
  }
}
