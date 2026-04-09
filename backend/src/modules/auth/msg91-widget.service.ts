import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError, ServiceUnavailableError } from '../../shared/errors.js';

export interface Msg91VerifiedIdentity {
  mobileNumber: string;
  reqId?: string;
  raw: unknown;
}

export class Msg91WidgetService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.msg91.baseUrl,
      timeout: 10000,
    });
  }

  getWidgetConfig() {
    if (!config.msg91.widgetId || !config.msg91.widgetToken) {
      throw new ServiceUnavailableError('MSG91 widget is not configured');
    }

    return {
      widgetId: config.msg91.widgetId,
      tokenAuth: config.msg91.widgetToken,
    };
  }

  async verifyAccessToken(accessToken: string): Promise<Msg91VerifiedIdentity> {
    if (!config.msg91.authKey || !config.msg91.widgetId) {
      throw new ServiceUnavailableError('MSG91 widget verification is not configured');
    }

    try {
      const { data } = await this.client.post<Record<string, unknown>>(
        '/api/v5/widget/verifyAccessToken',
        {
          widgetId: config.msg91.widgetId,
          token: accessToken,
          authkey: config.msg91.authKey,
        }
      );

      const mobileNumber =
        (data.mobile_number as string | undefined) ??
        (data.mobile as string | undefined) ??
        (data.phone as string | undefined);

      if (!mobileNumber) {
        throw new ExternalServiceError('MSG91 widget token did not resolve a mobile number', data);
      }

      return {
        mobileNumber,
        reqId: (data.reqId as string | undefined) ?? (data.req_id as string | undefined),
        raw: data,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('Failed to verify MSG91 widget access token', error);
    }
  }
}
