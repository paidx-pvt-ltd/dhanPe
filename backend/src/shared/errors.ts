export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class RiskRejectedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'RISK_REJECTED', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, message, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(503, message, 'SERVICE_UNAVAILABLE', details);
  }
}

export class InvalidTransactionTransitionError extends AppError {
  constructor(details: {
    transactionId: string;
    fromState: string;
    toState: string;
    reason?: string;
  }) {
    super(
      409,
      `Invalid transaction state transition: ${details.fromState} -> ${details.toState}`,
      'INVALID_TRANSACTION_TRANSITION',
      details
    );
  }
}
