import 'dart:async';

import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfwebcheckoutpayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpaymentgateway/cfpaymentgatewayservice.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfsession/cfsession.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfexceptions.dart';

import '../core/exceptions.dart';
import '../models/payment.dart';

class CashfreeService {
  final CFPaymentGatewayService _gateway = CFPaymentGatewayService();

  Future<void> launchCheckout(Payment payment, {required bool useSandbox}) async {
    final completer = Completer<void>();

    Future<void> onVerify(String orderId) async {
      if (!completer.isCompleted) {
        completer.complete();
      }
    }

    Future<void> onError(CFErrorResponse error, String orderId) async {
      if (!completer.isCompleted) {
        completer.completeError(
          PaymentException(error.getMessage() ?? 'Cashfree checkout failed'),
        );
      }
    }

    try {
      _gateway.setCallback(onVerify, onError);

      final session = CFSessionBuilder()
          .setEnvironment(useSandbox ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION)
          .setOrderId(payment.orderId)
          .setPaymentSessionId(payment.paymentSessionId)
          .build();

      final checkout = CFWebCheckoutPaymentBuilder().setSession(session).build();
      _gateway.doPayment(checkout);

      await completer.future.timeout(
        const Duration(minutes: 3),
        onTimeout: () => throw PaymentException('Cashfree checkout timed out'),
      );
    } on CFException catch (error) {
      throw PaymentException(error.message);
    }
  }
}
