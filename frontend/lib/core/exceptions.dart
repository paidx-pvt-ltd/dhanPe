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

  ApiError({
    required this.type,
    required this.message,
    this.code,
  });

  @override
  String toString() => 'ApiError: $message (${code ?? type.toString()})';
}

class AuthException extends Error {
  final String message;

  AuthException(this.message);

  @override
  String toString() => 'AuthException: $message';
}

class PaymentException extends Error {
  final String message;
  final String? paymentId;

  PaymentException(this.message, {this.paymentId});

  @override
  String toString() => 'PaymentException: $message';
}
