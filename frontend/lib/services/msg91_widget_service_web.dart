// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;

import '../core/exceptions.dart';
import 'msg91_widget_service_base.dart';

const _scriptUrl = 'https://verify.msg91.com/otp-provider.js';

class WebMsg91WidgetService implements Msg91WidgetService {
  Future<void>? _scriptLoader;
  bool _initialized = false;
  String? _widgetId;
  String? _tokenAuth;

  @override
  Future<void> initialize({
    required String widgetId,
    required String tokenAuth,
  }) async {
    await _ensureScriptLoaded();

    if (_initialized && _widgetId == widgetId && _tokenAuth == tokenAuth) {
      return;
    }

    // Guard against re-initialization on the same element (common during Hot Restarts)
    final host = html.document.getElementById('msg91-captcha-host');
    if (host != null && host.children.isNotEmpty) {
      // If the host already has children, it likely already has an hCaptcha iframe/container.
      // We mark as initialized and return early to avoid the "hCaptcha already rendered" error.
      _initialized = true;
      _widgetId = widgetId;
      _tokenAuth = tokenAuth;
      return;
    }

    final configuration = js.JsObject.jsify({
      'widgetId': widgetId,
      'tokenAuth': tokenAuth,
      'exposeMethods': true,
      'captchaRenderId': 'msg91-captcha-host',
      'success': (dynamic data) {},
      'failure': (dynamic error) {},
    });

    try {
      js.context.callMethod('initSendOTP', [configuration]);
      _initialized = true;
      _widgetId = widgetId;
      _tokenAuth = tokenAuth;
    } catch (error) {
      // If we still get an "already rendered" error, we can safely ignore it 
      // as it means the JS bridge is already alive.
      final errorStr = error.toString().toLowerCase();
      if (errorStr.contains('already rendered')) {
        _initialized = true;
        _widgetId = widgetId;
        _tokenAuth = tokenAuth;
        return;
      }
      throw AuthException('Failed to initialize MSG91 widget: $error');
    }
  }

  @override
  Future<void> sendOtp({
    required String identifier,
  }) async {
    _assertInitialized();
    final completer = Completer<void>();

    try {
      js.context.callMethod('sendOtp', [
        identifier,
        (dynamic data) {
          if (!completer.isCompleted) {
            completer.complete();
          }
        },
        (dynamic error) {
          if (!completer.isCompleted) {
            completer.completeError(_normalizeError(error, fallback: 'Failed to send OTP'));
          }
        },
      ]);
    } catch (error) {
      throw AuthException('Failed to send OTP: $error');
    }

    return completer.future;
  }

  @override
  Future<String> verifyOtp({
    required String otp,
  }) async {
    _assertInitialized();
    final completer = Completer<String>();

    try {
      js.context.callMethod('verifyOtp', [
        otp,
        (dynamic data) {
          final accessToken =
              _readProperty(data, 'token')?.toString() ??
              _readProperty(data, 'accessToken')?.toString() ??
              _readNestedProperty(data, 'data', 'token')?.toString() ??
              _readNestedProperty(data, 'data', 'accessToken')?.toString();

          if (accessToken == null || accessToken.isEmpty) {
            if (!completer.isCompleted) {
              completer.completeError(
                AuthException('MSG91 verification succeeded but did not return an access token.'),
              );
            }
            return;
          }

          if (!completer.isCompleted) {
            completer.complete(accessToken);
          }
        },
        (dynamic error) {
          if (!completer.isCompleted) {
            completer.completeError(_normalizeError(error, fallback: 'Failed to verify OTP'));
          }
        },
      ]);
    } catch (error) {
      throw AuthException('Failed to verify OTP: $error');
    }

    return completer.future;
  }

  @override
  Future<void> retryOtp() async {
    _assertInitialized();
    final completer = Completer<void>();

    try {
      js.context.callMethod('retryOtp', [
        (dynamic data) {
          if (!completer.isCompleted) {
            completer.complete();
          }
        },
        (dynamic error) {
          if (!completer.isCompleted) {
            completer.completeError(_normalizeError(error, fallback: 'Failed to resend OTP'));
          }
        },
      ]);
    } catch (error) {
      throw AuthException('Failed to resend OTP: $error');
    }

    return completer.future;
  }

  Future<void> _ensureScriptLoaded() {
    _scriptLoader ??= _loadScript();
    return _scriptLoader!;
  }

  Future<void> _loadScript() async {
    final existing = html.document.querySelector('script[data-msg91-otp="true"]');
    if (existing != null) {
      await _waitForGlobalMethod('initSendOTP');
      return;
    }

    final script = html.ScriptElement()
      ..src = _scriptUrl
      ..async = true
      ..dataset['msg91Otp'] = 'true';

    final completer = Completer<void>();
    script.onLoad.first.then((_) async {
      try {
        await _waitForGlobalMethod('initSendOTP');
        if (!completer.isCompleted) {
          completer.complete();
        }
      } catch (error) {
        if (!completer.isCompleted) {
          completer.completeError(error);
        }
      }
    });
    script.onError.first.then((_) {
      if (!completer.isCompleted) {
        completer.completeError(
          AuthException('Failed to load the MSG91 verification script.'),
        );
      }
    });

    html.document.head?.append(script);
    return completer.future;
  }

  Future<void> _waitForGlobalMethod(String methodName) async {
    for (var attempt = 0; attempt < 50; attempt++) {
      if (js.context.hasProperty(methodName)) {
        return;
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }

    throw AuthException('MSG91 verification script did not finish loading.');
  }

  void _assertInitialized() {
    if (!_initialized) {
      throw AuthException('MSG91 widget is not initialized.');
    }
  }

  AuthException _normalizeError(dynamic error, {required String fallback}) {
    final message =
        _readProperty(error, 'message')?.toString() ??
        _readProperty(error, 'error')?.toString() ??
        _readProperty(error, 'details')?.toString() ??
        fallback;
    final code = _readProperty(error, 'code')?.toString();
    return AuthException(message, code: code);
  }

  dynamic _readNestedProperty(dynamic source, String parentKey, String childKey) {
    final parent = _readProperty(source, parentKey);
    return _readProperty(parent, childKey);
  }

  dynamic _readProperty(dynamic source, String key) {
    if (source == null) {
      return null;
    }

    if (source is Map) {
      return source[key];
    }

    if (source is js.JsObject) {
      try {
        return source[key];
      } catch (_) {
        return null;
      }
    }

    try {
      final object = source as dynamic;
      return object[key];
    } catch (_) {
      return null;
    }
  }
}

Msg91WidgetService createMsg91WidgetService() => WebMsg91WidgetService();
