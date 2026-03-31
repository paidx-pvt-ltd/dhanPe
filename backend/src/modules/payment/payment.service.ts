import {
  KYCStatus,
  PaymentProvider,
  PayoutStatus,
  Prisma,
  PrismaClient,
  TransactionStatus,
} from '@prisma/client';
import { config } from '../../config/index.js';
import { prisma } from '../../db/prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { sha256 } from '../../utils/hash.js';
import { RiskService } from '../risk/risk.service.js';
import { PaymentRepository } from './payment.repository.js';
import { CashfreeClient } from './cashfree.client.js';
import { CreateTransferDto } from './payment.schemas.js';

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly riskService: RiskService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {}

  async createTransfer(userId: string, input: CreateTransferDto, idempotencyKey?: string) {
    const user = await this.paymentRepository.findUser(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User');
    }

    if (user.kycStatus !== KYCStatus.APPROVED) {
      throw new ValidationError('User KYC is not approved');
    }

    const requestHash = sha256(JSON.stringify(input));
    if (idempotencyKey) {
      const existingKey = await this.paymentRepository.findIdempotencyKey(idempotencyKey);
      if (existingKey?.requestHash === requestHash && existingKey.responseBody) {
        return existingKey.responseBody;
      }
    }

    await this.riskService.evaluateTransfer(userId, input.amount);

    const merchantOrderId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const transaction = await this.db.$transaction((tx) =>
      this.paymentRepository.createTransaction(tx, {
        userId,
        amount: input.amount.toString(),
        status: TransactionStatus.INITIATED,
        paymentProvider: PaymentProvider.CASHFREE,
        orderId: merchantOrderId,
        payoutStatus: PayoutStatus.PENDING,
        bankAccount: input.bankAccount,
        description: input.description,
        idempotencyKey,
      })
    );

    const order = await this.cashfreeClient.createOrder({
      order_id: merchantOrderId,
      order_amount: input.amount,
      order_currency: 'INR',
      order_note: input.description,
      customer_details: {
        customer_id: user.id,
        customer_email: user.email,
        customer_phone: user.phoneNumber ?? undefined,
      },
      order_meta: {
        notify_url: `${config.server.appUrl}/webhook/cashfree`,
      },
    });

    await this.paymentRepository.updateTransactionOrder(transaction.id, {
      providerOrderId: order.cf_order_id,
      metadata: order as unknown as Prisma.InputJsonValue,
    });

    const response = {
      transactionId: transaction.id,
      orderId: merchantOrderId,
      orderToken: order.order_token,
      amount: input.amount,
      status: transaction.status,
    };

    if (idempotencyKey) {
      await this.paymentRepository.saveIdempotencyRecord({
        key: idempotencyKey,
        scope: 'TRANSFER',
        userId,
        requestHash,
        resourceId: transaction.id,
        responseBody: response,
      });
    }

    return response;
  }
}
