import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError, ServiceUnavailableError } from '../../shared/errors.js';

type Msg91OtpResponse = {
  type?: string;
  message?: string;
  code?: string | number;
  error?: string;
};

export class Msg91OtpService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.msg91.baseUrl,
      timeout: 10000,
    });
  }

  async sendOtp(mobileNumber: string): Promise<{ reqId: string }> {
    if (!config.msg91.authKey) {
      throw new ServiceUnavailableError('MSG91 OTP service is not configured');
    }

    try {
      const { data } = await this.client.get<Msg91OtpResponse>('/api/sendotp.php', {
        params: {
          authkey: config.msg91.authKey,
          mobile: mobileNumber,
          // MSG91 defaults are acceptable; keep it simple and configurable later if needed.
        },
      });

      if (data?.type === 'success' && data.message) {
        return { reqId: data.message };
      }

      throw this.toMsg91Error('Failed to send OTP via MSG91', data);
    } catch (error) {
      if (error instanceof ExternalServiceError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw this.toMsg91Error('Failed to send OTP via MSG91', error);
    }
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<void> {
    if (!config.msg91.authKey) {
      throw new ServiceUnavailableError('MSG91 OTP service is not configured');
    }

    try {
      const { data } = await this.client.get<Msg91OtpResponse>('/api/verifyRequestOTP.php', {
        params: {
          authkey: config.msg91.authKey,
          mobile: mobileNumber,
          otp,
        },
      });

      if (data?.type === 'success') {
        return;
      }

      throw this.toMsg91Error('OTP verification failed', data);
    } catch (error) {
      if (error instanceof ExternalServiceError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw this.toMsg91Error('OTP verification failed', error);
    }
  }

  private toMsg91Error(message: string, error: unknown) {
    const details = this.toSafeDetails(error);
    if (this.isIpWhitelistFailure(details)) {
      return new ServiceUnavailableError('OTP delivery is temporarily unavailable', {
        provider: 'MSG91',
        reason: 'IP_NOT_WHITELISTED',
        action:
          'Whitelist the backend outbound IP in MSG91 API Security, or disable API Security for this authkey.',
        details,
      });
    }

    return new ExternalServiceError(message, {
      provider: 'MSG91',
      details,
    });
  }

  private toSafeDetails(error: unknown): unknown {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        data: error.response?.data as unknown,
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return error;
  }

  private isIpWhitelistFailure(details: unknown): boolean {
    if (details == null) {
      return false;
    }

    if (typeof details === 'string' || typeof details === 'number') {
      return details.toString().includes('418');
    }

    if (typeof details !== 'object') {
      return false;
    }

    return Object.values(details as Record<string, unknown>).some((value) => {
      if (typeof value === 'string' || typeof value === 'number') {
        const normalized = value.toString().toLowerCase();
        return normalized === '418' || normalized.includes('ip not whitelisted');
      }

      return this.isIpWhitelistFailure(value);
    });
  }
}
