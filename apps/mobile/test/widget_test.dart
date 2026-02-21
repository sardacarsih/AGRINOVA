// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:agrinova_mobile/main_simple.dart';

void main() {
  testWidgets('Agrinova simple app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const AgrinovaSimpleApp());

    expect(find.text('Agrinova Mobile'), findsWidgets);
    expect(find.text('Palm Oil Management System'), findsOneWidget);
    expect(find.textContaining('Production Ready Status'), findsOneWidget);
  });
}
