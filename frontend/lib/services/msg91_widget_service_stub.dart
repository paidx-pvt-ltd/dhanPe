import '../core/exceptions.dart';
import 'msg91_widget_service_base.dart';

class UnsupportedMsg91WidgetService implements Msg91WidgetService {
  @override
  Future<void> initialize({
    required String widgetId,
    required String tokenAuth,
  }) {
    throw AuthException('MSG91 widget is only supported on Flutter web in this build.');
  }

  @override
  Future<void> retryOtp() {
    throw AuthException('MSG91 widget is only supported on Flutter web in this build.');
  }

  @override
  Future<void> sendOtp({
    required String identifier,
  }) {
    throw AuthException('MSG91 widget is only supported on Flutter web in this build.');
  }

  @override
  Future<String> verifyOtp({
    required String otp,
  }) {
    throw AuthException('MSG91 widget is only supported on Flutter web in this build.');
  }
}

Msg91WidgetService createMsg91WidgetService() => UnsupportedMsg91WidgetService();
