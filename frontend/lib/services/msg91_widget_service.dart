import 'msg91_widget_service_stub.dart'
    if (dart.library.html) 'msg91_widget_service_web.dart'
    as impl;
import 'msg91_widget_service_base.dart';

export 'msg91_widget_service_base.dart';

Msg91WidgetService createMsg91WidgetService() => impl.createMsg91WidgetService();
