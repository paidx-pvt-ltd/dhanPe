import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError, ServiceUnavailableError } from '../../shared/errors.js';

type UnknownRecord = Record<string, unknown>;

const readString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
};

const readObject = (value: unknown): UnknownRecord | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return undefined;
};

const pickMobileNumber = (payload: unknown): string | undefined => {
  const obj = readObject(payload);
  if (!obj) return undefined;

  // Common top-level keys we have observed / might receive.
  const direct =
    readString(obj.mobile_number) ??
    readString(obj.mobile) ??
    readString(obj.phone) ??
    readString(obj.mobileNumber) ??
    readString(obj.msisdn) ??
    readString(obj.identifier);
  if (direct) return direct;

  // Some MSG91 responses nest actual values under `data`.
  const nested = readObject(obj.data);
  if (!nested) return undefined;

  return (
    readString(nested.mobile_number) ??
    readString(nested.mobile) ??
    readString(nested.phone) ??
    readString(nested.mobileNumber) ??
    readString(nested.msisdn) ??
    readString(nested.identifier)
  );
};

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
        },
        {
          headers: {
            authkey: config.msg91.authKey,
          },
        }
      );

      const mobileNumber = pickMobileNumber(data);

      if (!mobileNumber) {
        const keys = Object.keys(data ?? {});
        throw new ExternalServiceError('MSG91 widget token did not resolve a mobile number', {
          keys,
          raw: data,
        });
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

      const details =
        (axios.isAxiosError(error) && error.response)
          ? {
              status: error.response.status,
              data: error.response.data as unknown,
              headers: error.response.headers as unknown,
            }
          : error;

      throw new ExternalServiceError('Failed to verify MSG91 widget access token', details);
    }
  }
}
