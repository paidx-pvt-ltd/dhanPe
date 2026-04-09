// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';

const _viewType = 'msg91-captcha-host-view';

bool _registered = false;

class Msg91CaptchaHost extends StatelessWidget {
  const Msg91CaptchaHost({super.key});

  @override
  Widget build(BuildContext context) {
    if (!_registered) {
      _registered = true;
      ui_web.platformViewRegistry.registerViewFactory(_viewType, (int _) {
        final element = html.DivElement()
          ..id = 'msg91-captcha-host'
          ..style.width = '1px'
          ..style.height = '1px'
          ..style.minHeight = '0'
          ..style.overflow = 'hidden'
          ..style.position = 'absolute'
          ..style.top = '-9999px'
          ..style.left = '-9999px';
        return element;
      });
    }

    return const SizedBox(
      width: 1,
      height: 1,
      child: HtmlElementView(viewType: _viewType),
    );
  }
}
