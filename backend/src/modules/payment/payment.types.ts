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
  order_status: string;
}

export interface CashfreePayoutRequest {
  transfer_id: string;
  transfer_amount: number;
  transfer_currency: string;
  beneficiary_details: {
    beneficiary_name: string;
    beneficiary_account: string;
    beneficiary_ifsc: string;
  };
}

export interface CashfreePayoutResponse {
  reference_id: string;
  status: string;
}
