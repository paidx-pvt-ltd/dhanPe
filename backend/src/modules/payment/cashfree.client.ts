import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError } from '../../shared/errors.js';
import {
  CashfreeBankValidationRequest,
  CashfreeBankValidationResponse,
  CashfreeBeneficiaryRequest,
  CashfreeBeneficiaryResponse,
  CashfreeCreateRefundRequest,
  CashfreeOrderRequest,
  CashfreeOrderResponse,
  CashfreePanVerificationRequest,
  CashfreePanVerificationResponse,
  CashfreePayoutRequest,
  CashfreePayoutResponse,
  CashfreeRefundResponse,
  CashfreeTransferStatusResponse,
} from './payment.types.js';

export class CashfreeClient {
  private readonly orderClient: AxiosInstance;
  private readonly payoutClient: AxiosInstance;

  constructor() {
    const orderHeaders = {
      'x-client-id': config.cashfree.clientId,
      'x-client-secret': config.cashfree.clientSecret,
      'x-api-version': '2024-01-01',
    };
    const payoutHeaders = {
      'x-client-id': config.cashfree.payoutClientId,
      'x-client-secret': config.cashfree.payoutClientSecret,
      'x-api-version': '2024-01-01',
    };

    this.orderClient = axios.create({
      baseURL: config.cashfree.baseUrl,
      headers: orderHeaders,
      timeout: 10000,
    });

    this.payoutClient = axios.create({
      baseURL: config.cashfree.payoutBaseUrl,
      headers: payoutHeaders,
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
      throw new ExternalServiceError(
        `Failed to create Cashfree beneficiary. Verify CASHFREE_PAYOUT_BASE_URL (${config.cashfree.payoutBaseUrl}) and payout credentials.`,
        error
      );
    }
  }

  async createRefund(
    orderId: string,
    payload: CashfreeCreateRefundRequest
  ): Promise<CashfreeRefundResponse> {
    try {
      const { data } = await this.orderClient.post<CashfreeRefundResponse[]>(
        `/pg/orders/${orderId}/refunds`,
        payload
      );
      return Array.isArray(data) ? data[0]! : (data as unknown as CashfreeRefundResponse);
    } catch (error) {
      throw new ExternalServiceError('Failed to create Cashfree refund', error);
    }
  }

  async getRefund(orderId: string, refundId: string): Promise<CashfreeRefundResponse> {
    try {
      const { data } = await this.orderClient.get<CashfreeRefundResponse>(
        `/pg/orders/${orderId}/refunds/${refundId}`
      );
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to fetch Cashfree refund status', error);
    }
  }

  async verifyPan(
    payload: CashfreePanVerificationRequest
  ): Promise<CashfreePanVerificationResponse> {
    try {
      const { data } = await this.orderClient.post<Record<string, unknown>>(
        '/verification/pan',
        payload
      );

      return {
        valid: Boolean(data.valid ?? data.success ?? data.verified),
        name:
          (data.name as string | undefined) ??
          (data.registered_name as string | undefined) ??
          (data.pan_name as string | undefined),
        pan: (data.pan as string | undefined) ?? payload.pan,
        status: (data.status as string | undefined) ?? (data.message as string | undefined),
        referenceId:
          (data.reference_id as string | undefined) ?? (data.ref_id as string | undefined),
        raw: data,
      };
    } catch (error) {
      throw new ExternalServiceError('Failed to verify PAN with Cashfree', error);
    }
  }

  async validateBankAccount(
    payload: CashfreeBankValidationRequest
  ): Promise<CashfreeBankValidationResponse> {
    try {
      const { data } = await this.payoutClient.post<Record<string, unknown>>(
        '/payout/validate/bank-account',
        payload
      );

      return {
        valid: Boolean(data.valid ?? data.success ?? data.verified),
        accountHolderName:
          (data.accountHolderName as string | undefined) ??
          (data.account_holder_name as string | undefined) ??
          (data.name_at_bank as string | undefined),
        bankAccount:
          (data.bankAccount as string | undefined) ??
          (data.account_number as string | undefined) ??
          payload.bankAccount,
        ifsc: (data.ifsc as string | undefined) ?? payload.ifsc,
        status: (data.status as string | undefined) ?? (data.message as string | undefined),
        referenceId:
          (data.reference_id as string | undefined) ?? (data.ref_id as string | undefined),
        raw: data,
      };
    } catch (error) {
      throw new ExternalServiceError('Failed to validate beneficiary bank account', error);
    }
  }
}
