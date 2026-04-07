import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { ExternalServiceError } from '../../shared/errors.js';

type DiditCreateSessionResponse = {
  session_id: string;
  session_token: string;
  verification_url?: string;
  session_url?: string;
  status: string;
};

type DiditGetSessionResponse = {
  session_id: string;
  workflow_id: string;
  vendor_data?: string;
  status: string;
  verification_url?: string;
  session_url?: string;
};

export class DiditClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.didit.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.didit.apiKey,
      },
    });
  }

  async createSession(payload: {
    workflow_id: string;
    vendor_data: string;
    callback?: string;
  }): Promise<DiditCreateSessionResponse> {
    try {
      const { data } = await this.client.post<DiditCreateSessionResponse>('/session/', payload);
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to create Didit verification session', error);
    }
  }

  async getSession(sessionId: string): Promise<DiditGetSessionResponse> {
    try {
      const { data } = await this.client.get<DiditGetSessionResponse>(
        `/session/${sessionId}/decision/`
      );
      return data;
    } catch (error) {
      throw new ExternalServiceError('Failed to fetch Didit verification session', error);
    }
  }
}
