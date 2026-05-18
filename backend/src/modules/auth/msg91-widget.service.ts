import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import {
  AuthenticationError,
  ExternalServiceError,
  ServiceUnavailableError,
  ValidationError,
} from '../../shared/errors.js';

export type Msg91WidgetVerifiedIdentity = {
  mobileNumber: string;
  identifier?: string;
  message?: string;
};

type Msg91VerifyAccessTokenResponse = {
  type?: string;
  message?: string;
  identifier?: string;
  mobile?: string;
  mobile_no?: string;
  data?: {
    identifier?: string;
    mobile?: string;
    mobile_no?: string;
  };
};

export class Msg91WidgetService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.msg91.widgetVerifyBaseUrl,
      timeout: 10000,
    });
  }

  getPublicConfig() {
    const widgetEnabled =
      config.msg91.widgetEnabled &&
      Boolean(config.msg91.widgetId) &&
      (Boolean(config.msg91.widgetToken) || config.msg91.sandboxEnabled);

    return {
      widgetEnabled,
      widgetId: widgetEnabled ? config.msg91.widgetId : null,
      widgetToken: widgetEnabled ? config.msg91.widgetToken : null,
      sandboxEnabled: config.msg91.sandboxEnabled,
      legacyOtpEnabled: !widgetEnabled || config.msg91.sandboxEnabled,
    };
  }

  async verifyAccessToken(input: {
    accessToken: string;
    mobileNumber: string;
  }): Promise<Msg91WidgetVerifiedIdentity> {
    const expectedMobile = this.normalizeMobileNumber(input.mobileNumber);
    const accessToken = input.accessToken.trim();

    if (!accessToken) {
      throw new ValidationError('MSG91 access token is required');
    }

    if (config.msg91.sandboxEnabled) {
      if (accessToken.startsWith('sandbox-widget-')) {
        const embeddedMobile = accessToken.replace('sandbox-widget-', '');
        const normalizedEmbedded = this.normalizeMobileNumber(embeddedMobile);
        if (normalizedEmbedded !== expectedMobile) {
          throw new AuthenticationError('Sandbox widget token does not match the submitted mobile number');
        }

        return {
          mobileNumber: normalizedEmbedded,
          identifier: normalizedEmbedded.replace('+', ''),
          message: 'Sandbox widget verification succeeded',
        };
      }
    }

    if (!config.msg91.authKey) {
      throw new ServiceUnavailableError('MSG91 widget verification is not configured');
    }

    if (!config.msg91.widgetId) {
      throw new ServiceUnavailableError('MSG91 widget ID is not configured');
    }

    try {
      const { data } = await this.client.post<Msg91VerifyAccessTokenResponse>(
        '/widget/verifyAccessToken',
        {
          authkey: config.msg91.authKey,
          'access-token': accessToken,
        }
      );

      if (data?.type && data.type !== 'success') {
        throw new AuthenticationError('MSG91 widget access token verification failed', data);
      }

      const identifier =
        data.identifier ??
        data.mobile ??
        data.mobile_no ??
        data.data?.identifier ??
        data.data?.mobile ??
        data.data?.mobile_no;

      if (!identifier) {
        throw new AuthenticationError(
          'MSG91 widget verification succeeded but no mobile identifier was returned',
          data
        );
      }

      const verifiedMobile = this.normalizeMobileNumber(identifier);
      if (verifiedMobile !== expectedMobile) {
        throw new AuthenticationError(
          'Verified mobile number does not match the number submitted for login'
        );
      }

      return {
        mobileNumber: verifiedMobile,
        identifier: identifier.toString(),
        message: data.message,
      };
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof ServiceUnavailableError
      ) {
        throw error;
      }

      throw new ExternalServiceError('Failed to verify MSG91 widget access token', error);
    }
  }

  private normalizeMobileNumber(mobileNumber: string) {
    const normalized = mobileNumber.replace(/[^\d+]/g, '');
    if (!/^\+?\d{10,15}$/.test(normalized)) {
      throw new ValidationError('Mobile number must be a valid MSISDN');
    }

    return normalized.startsWith('+') ? normalized : `+91${normalized.slice(-10)}`;
  }
}
