import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'http_client.dart';
import 'auth_service.dart';
import 'beneficiary_service.dart';
import 'cashfree_service.dart';
import 'msg91_widget_service.dart';
import 'user_service.dart';
import 'payment_service.dart';
import 'transaction_service.dart';

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

  getIt.registerSingleton<Msg91WidgetService>(createMsg91WidgetService());

  getIt.registerSingleton<CashfreeService>(CashfreeService());

  getIt.registerSingleton<UserService>(UserService(httpClient.getDio()));

  getIt.registerSingleton<BeneficiaryService>(
    BeneficiaryService(httpClient.getDio()),
  );

  getIt.registerSingleton<PaymentService>(PaymentService(httpClient.getDio()));

  getIt.registerSingleton<TransactionService>(
    TransactionService(httpClient.getDio()),
  );
}
