export interface CashfreeOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_note?: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone?: string;
  };
  order_meta?: {
    notify_url?: string;
    return_url?: string;
  };
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_token: string;
  payment_session_id?: string;
  order_status: string;
}

export interface CashfreePayoutRequest {
  transfer_id: string;
  transfer_amount: number;
  transfer_currency: string;
  beneficiary_details: {
    beneficiary_id: string;
  };
}

export interface CashfreePayoutResponse {
  reference_id: string;
  cf_transfer_id?: string;
  status: string;
  status_code?: string;
  status_description?: string;
}

export interface CashfreeTransferStatusResponse {
  transfer_id: string;
  cf_transfer_id?: string;
  status: string;
  status_code?: string;
  status_description?: string;
  beneficiary_details?: {
    beneficiary_id?: string;
  };
  transfer_amount?: number;
  transfer_currency?: string;
  transfer_mode?: string;
  added_on?: string;
  updated_on?: string;
}

export interface CashfreeBeneficiaryRequest {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_instrument_details: {
    bank_account_number?: string;
    bank_ifsc?: string;
    vpa?: string;
  };
  beneficiary_contact_details: {
    beneficiary_email: string;
    beneficiary_phone: string;
    beneficiary_country_code: string;
    beneficiary_address: string;
    beneficiary_city: string;
    beneficiary_state: string;
    beneficiary_postal_code: string;
  };
}

export interface CashfreeBeneficiaryResponse {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_status: string;
  added_on?: string;
}

export interface CashfreeCreateRefundRequest {
  refund_amount: number;
  refund_id: string;
  refund_note?: string;
  refund_speed?: 'STANDARD' | 'INSTANT';
}

export interface CashfreeRefundResponse {
  cf_payment_id?: string | number;
  cf_refund_id?: string;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency?: string;
  refund_note?: string;
  refund_status: string;
  status_description?: string;
  created_at?: string;
}
