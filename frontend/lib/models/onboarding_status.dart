class OnboardingStatus {
  final String currentStep;
  final List<OnboardingStepStatus> steps;
  final bool canAddBeneficiary;
  final bool canTransfer;
  final bool panFallbackAvailable;

  const OnboardingStatus({
    required this.currentStep,
    required this.steps,
    required this.canAddBeneficiary,
    required this.canTransfer,
    required this.panFallbackAvailable,
  });

  factory OnboardingStatus.fromJson(Map<String, dynamic> json) {
    final stepsJson = json['steps'] as List<dynamic>? ?? const [];
    return OnboardingStatus(
      currentStep: json['currentStep']?.toString() ?? 'MOBILE_VERIFICATION',
      steps: stepsJson
          .map((item) => OnboardingStepStatus.fromJson(item as Map<String, dynamic>))
          .toList(),
      canAddBeneficiary: json['canAddBeneficiary'] == true,
      canTransfer: json['canTransfer'] == true,
      panFallbackAvailable: json['panFallbackAvailable'] == true,
    );
  }
}

class OnboardingStepStatus {
  final String id;
  final String label;
  final bool completed;
  final bool required;

  const OnboardingStepStatus({
    required this.id,
    required this.label,
    required this.completed,
    required this.required,
  });

  factory OnboardingStepStatus.fromJson(Map<String, dynamic> json) {
    return OnboardingStepStatus(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      completed: json['completed'] == true,
      required: json['required'] == true,
    );
  }
}

class Msg91WidgetConfig {
  final bool widgetEnabled;
  final String? widgetId;
  final String? widgetToken;
  final bool sandboxEnabled;
  final bool legacyOtpEnabled;

  const Msg91WidgetConfig({
    required this.widgetEnabled,
    this.widgetId,
    this.widgetToken,
    required this.sandboxEnabled,
    required this.legacyOtpEnabled,
  });

  factory Msg91WidgetConfig.fromJson(Map<String, dynamic> json) {
    return Msg91WidgetConfig(
      widgetEnabled: json['widgetEnabled'] == true,
      widgetId: json['widgetId']?.toString(),
      widgetToken: json['widgetToken']?.toString(),
      sandboxEnabled: json['sandboxEnabled'] == true,
      legacyOtpEnabled: json['legacyOtpEnabled'] == true,
    );
  }
}
