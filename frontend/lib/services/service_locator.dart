import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'services/http_client.dart';
import 'services/auth_service.dart';
import 'services/user_service.dart';
import 'services/payment_service.dart';
import 'services/transaction_service.dart';

final getIt = GetIt.instance;

void setupServiceLocator() {
  // Storage
  const storage = FlutterSecureStorage();
  getIt.registerSingleton<FlutterSecureStorage>(storage);

  // HTTP Client
  final httpClient = HttpClient(storage);
  getIt.registerSingleton<HttpClient>(httpClient);

  // Services
  getIt.registerSingleton<AuthService>(
    AuthService(httpClient.getDio(), storage),
  );

  getIt.registerSingleton<UserService>(
    UserService(httpClient.getDio()),
  );

  getIt.registerSingleton<PaymentService>(
    PaymentService(httpClient.getDio()),
  );

  getIt.registerSingleton<TransactionService>(
    TransactionService(httpClient.getDio()),
  );
}
