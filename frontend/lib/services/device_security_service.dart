import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class DeviceSecurityStatus {
  const DeviceSecurityStatus({
    required this.deviceLockEnabled,
    required this.deviceCompromised,
    required this.installerTrusted,
  });

  final bool deviceLockEnabled;
  final bool deviceCompromised;
  final bool installerTrusted;

  bool get isCompliant =>
      deviceLockEnabled && !deviceCompromised && installerTrusted;
}

class DeviceSecurityService {
  static const MethodChannel _channel = MethodChannel('dhanpe/device_security');

  Future<DeviceSecurityStatus> checkDeviceSecurity() async {
    if (kIsWeb) {
      return const DeviceSecurityStatus(
        deviceLockEnabled: true,
        deviceCompromised: false,
        installerTrusted: true,
      );
    }

    try {
      final result = await _channel.invokeMapMethod<String, dynamic>(
        'assessDeviceSecurity',
      );
      return DeviceSecurityStatus(
        deviceLockEnabled: result?['deviceLockEnabled'] == true,
        deviceCompromised: result?['deviceCompromised'] == true,
        installerTrusted: result?['installerTrusted'] == true,
      );
    } on PlatformException {
      return _fallbackStatus();
    } on MissingPluginException {
      return _fallbackStatus();
    }
  }

  DeviceSecurityStatus _fallbackStatus() {
    if (kDebugMode) {
      return const DeviceSecurityStatus(
        deviceLockEnabled: true,
        deviceCompromised: false,
        installerTrusted: true,
      );
    }

    return const DeviceSecurityStatus(
      deviceLockEnabled: false,
      deviceCompromised: true,
      installerTrusted: false,
    );
  }
}
