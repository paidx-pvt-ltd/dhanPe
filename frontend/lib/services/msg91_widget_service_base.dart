abstract class Msg91WidgetService {
  Future<void> initialize({
    required String widgetId,
    required String tokenAuth,
  });

  Future<void> sendOtp({
    required String identifier,
  });

  Future<String> verifyOtp({
    required String otp,
  });

  Future<void> retryOtp();
}
