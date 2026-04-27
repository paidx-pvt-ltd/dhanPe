enum ApiException {
  networkError,
  serverError,
  unauthorizedError,
  validationError,
  notFoundError,
  timeoutError,
  unknownError,
}

class ApiError extends Error {
  final ApiException type;
  final String message;
  final String? code;

  ApiError({required this.type, required this.message, this.code});

  @override
  String toString() => 'ApiError: $message (${code ?? type.toString()})';
}

class AuthException extends Error {
  final String message;
  final String? code;

  AuthException(this.message, {this.code});

  @override
  String toString() => 'AuthException: $message (${code ?? 'auth'})';
}

class PaymentException extends Error {
  final String message;
  final String? paymentId;
  final String? code;

  PaymentException(this.message, {this.paymentId, this.code});

  @override
  String toString() => 'PaymentException: $message (${code ?? 'payment'})';
}
