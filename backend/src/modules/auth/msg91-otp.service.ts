import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError, ServiceUnavailableError } from '../../shared/errors.js';

type Msg91OtpResponse = {
  type?: string;
  message?: string;
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

      throw new ExternalServiceError('Failed to send OTP via MSG91', data);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to send OTP via MSG91', error);
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

      throw new ExternalServiceError('OTP verification failed', data);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('OTP verification failed', error);
    }
  }
}

