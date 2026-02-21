import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:get_it/get_it.dart';

import 'package:agrinova_mobile/core/di/dependency_injection.dart';
import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/services/jwt_storage_service.dart';
import 'package:agrinova_mobile/core/services/sync_service.dart';
import 'package:agrinova_mobile/core/network/dio_client.dart';

import 'mock_services.dart';

/// Test helpers and utilities for widget and integration tests
class TestHelpers {
  static final GetIt _getIt = GetIt.instance;

  /// Setup test dependencies with mocks
  static Future<void> setupTestDependencies() async {
    // Reset GetIt instance
    await _getIt.reset();

    // Register mock services
    _getIt.registerSingleton<DatabaseService>(MockDatabaseService());
    _getIt.registerSingleton<JwtStorageService>(MockJwtStorageService());
    _getIt.registerSingleton<SyncService>(MockSyncService());
    _getIt.registerSingleton<DioClient>(MockDioClient());
  }

  /// Cleanup test dependencies
  static Future<void> cleanupTestDependencies() async {
    await _getIt.reset();
  }

  /// Create a testable widget with necessary providers and themes
  static Widget createTestableWidget({
    required Widget child,
    List<BlocProvider>? providers,
    ThemeData? theme,
    Locale? locale,
  }) {
    return MaterialApp(
      theme: theme ?? _createTestTheme(),
      locale: locale ?? const Locale('id', 'ID'),
      home: providers != null
          ? MultiBlocProvider(
              providers: providers,
              child: child,
            )
          : child,
    );
  }

  /// Create a test theme
  static ThemeData _createTestTheme() {
    return ThemeData(
      primarySwatch: Colors.green,
      fontFamily: 'Inter',
    );
  }

  /// Pump and settle with standard timeout
  static Future<void> pumpAndSettleWithTimeout(
    WidgetTester tester, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    await tester.pumpAndSettle(timeout);
  }

  /// Find text containing specific string (case insensitive)
  static Finder findTextContaining(String text) {
    return find.byWidgetPredicate(
      (Widget widget) =>
          widget is Text &&
          widget.data != null &&
          widget.data!.toLowerCase().contains(text.toLowerCase()),
    );
  }

  /// Find widget by type and text
  static Finder findWidgetWithText<T extends Widget>(String text) {
    return find.byWidgetPredicate(
      (Widget widget) =>
          widget is T &&
          widget.toString().toLowerCase().contains(text.toLowerCase()),
    );
  }

  /// Tap and pump with timeout
  static Future<void> tapAndPump(
    WidgetTester tester,
    Finder finder, {
    Duration pumpDuration = const Duration(milliseconds: 100),
  }) async {
    await tester.tap(finder);
    await tester.pump(pumpDuration);
  }

  /// Enter text and pump
  static Future<void> enterTextAndPump(
    WidgetTester tester,
    Finder finder,
    String text, {
    Duration pumpDuration = const Duration(milliseconds: 100),
  }) async {
    await tester.enterText(finder, text);
    await tester.pump(pumpDuration);
  }

  /// Scroll until widget is visible
  static Future<void> scrollUntilVisible(
    WidgetTester tester,
    Finder finder,
    Finder scrollable, {
    double delta = 100.0,
    int maxScrolls = 50,
  }) async {
    int scrollCount = 0;
    while (!finder.evaluate().isNotEmpty && scrollCount < maxScrolls) {
      await tester.scroll(scrollable, const Offset(0, -100));
      await tester.pump();
      scrollCount++;
    }
  }

  /// Wait for specific condition
  static Future<void> waitFor(
    WidgetTester tester,
    bool Function() condition, {
    Duration timeout = const Duration(seconds: 10),
    Duration pollInterval = const Duration(milliseconds: 100),
  }) async {
    final stopwatch = Stopwatch()..start();
    
    while (!condition() && stopwatch.elapsed < timeout) {
      await tester.pump(pollInterval);
    }
    
    if (!condition()) {
      throw TimeoutException(
        'Condition not met within timeout',
        timeout,
      );
    }
  }

  /// Verify widget exists
  static void verifyWidgetExists(Finder finder) {
    expect(finder, findsOneWidget);
  }

  /// Verify widget does not exist
  static void verifyWidgetDoesNotExist(Finder finder) {
    expect(finder, findsNothing);
  }

  /// Verify text exists
  static void verifyTextExists(String text) {
    expect(find.text(text), findsOneWidget);
  }

  /// Verify text containing specific string exists
  static void verifyTextContainingExists(String text) {
    expect(findTextContaining(text), findsOneWidget);
  }

  /// Mock navigation observer for testing navigation
  static NavigatorObserver createMockNavigatorObserver() {
    return MockNavigatorObserver();
  }
}

/// Custom finders for common UI patterns
class AppFinders {
  /// Find loading indicator
  static Finder get loadingIndicator => find.byType(CircularProgressIndicator);

  /// Find refresh indicator
  static Finder get refreshIndicator => find.byType(RefreshIndicator);

  /// Find floating action button
  static Finder get floatingActionButton => find.byType(FloatingActionButton);

  /// Find app bar
  static Finder get appBar => find.byType(AppBar);

  /// Find drawer
  static Finder get drawer => find.byType(Drawer);

  /// Find bottom navigation bar
  static Finder get bottomNavigationBar => find.byType(BottomNavigationBar);

  /// Find elevated button by text
  static Finder elevatedButtonByText(String text) =>
      find.widgetWithText(ElevatedButton, text);

  /// Find text form field by label
  static Finder textFormFieldByLabel(String label) =>
      find.byWidgetPredicate(
        (widget) =>
            widget is TextFormField &&
            widget.decoration?.labelText == label,
      );

  /// Find card containing specific text
  static Finder cardWithText(String text) =>
      find.ancestor(
        of: find.text(text),
        matching: find.byType(Card),
      );

  /// Find list tile with title
  static Finder listTileWithTitle(String title) =>
      find.byWidgetPredicate(
        (widget) =>
            widget is ListTile &&
            widget.title is Text &&
            (widget.title as Text).data == title,
      );
}

/// Test data factory for creating test objects
class TestDataFactory {
  /// Create test harvest data
  static Map<String, dynamic> createTestHarvestData({
    String? id,
    String? employeeId,
    String? employeeName,
    String? blockId,
    String? blockName,
    double? tbsQuantity,
    String? qualityGrade,
    String? status,
    DateTime? harvestDate,
  }) {
    return {
      'id': id ?? 'test-harvest-1',
      'employeeId': employeeId ?? 'emp-001',
      'employeeName': employeeName ?? 'Test Employee',
      'blockId': blockId ?? 'block-001',
      'blockName': blockName ?? 'Test Block A1',
      'tbsQuantity': tbsQuantity ?? 1000.0,
      'qualityGrade': qualityGrade ?? 'A',
      'status': status ?? 'PENDING',
      'harvestDate': (harvestDate ?? DateTime.now()).toIso8601String(),
      'notes': 'Test harvest notes',
      'photos': <String>[],
      'createdBy': 'test-user',
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
      'syncStatus': 'PENDING',
    };
  }

  /// Create test gate check data
  static Map<String, dynamic> createTestGateCheckData({
    String? id,
    String? licensePlate,
    String? driverName,
    String? blockId,
    String? estateId,
    double? estimatedWeight,
    String? status,
    DateTime? entryTime,
  }) {
    return {
      'id': id ?? 'test-gate-1',
      'licensePlate': licensePlate ?? 'B 1234 ABC',
      'driverName': driverName ?? 'Test Driver',
      'blockId': blockId ?? 'block-001',
      'blockName': 'Test Block A1',
      'estateId': estateId ?? 'estate-001',
      'estateName': 'Test Estate',
      'doNumber': 'DO123456',
      'entryTime': (entryTime ?? DateTime.now()).toIso8601String(),
      'exitTime': null,
      'estimatedWeight': estimatedWeight ?? 5000.0,
      'actualWeight': null,
      'status': status ?? 'ENTRY',
      'notes': 'Test gate check notes',
      'createdBy': 'test-user',
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
      'syncStatus': 'PENDING',
      'photos': <String>[],
    };
  }

  /// Create test user data
  static Map<String, dynamic> createTestUserData({
    String? id,
    String? username,
    String? name,
    String? role,
    String? company,
    String? estate,
  }) {
    return {
      'id': id ?? 'test-user-1',
      'username': username ?? 'testuser',
      'name': name ?? 'Test User',
      'email': 'test@example.com',
      'role': role ?? 'mandor',
      'company': company ?? 'company-001',
      'estate': estate ?? 'estate-001',
      'division': 'division-001',
      'isActive': true,
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }

  /// Create test employee data
  static Map<String, dynamic> createTestEmployeeData({
    String? id,
    String? code,
    String? name,
    String? position,
    String? divisionId,
  }) {
    return {
      'id': id ?? 'emp-001',
      'code': code ?? 'EMP001',
      'name': name ?? 'Test Employee',
      'position': position ?? 'Harvester',
      'divisionId': divisionId ?? 'div-001',
      'divisionName': 'Test Division',
      'isActive': true,
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }

  /// Create test block data
  static Map<String, dynamic> createTestBlockData({
    String? id,
    String? code,
    String? name,
    String? divisionId,
    String? estateId,
  }) {
    return {
      'id': id ?? 'block-001',
      'code': code ?? 'BLK001',
      'name': name ?? 'Block A1',
      'divisionId': divisionId ?? 'div-001',
      'divisionName': 'Test Division',
      'estateId': estateId ?? 'estate-001',
      'estateName': 'Test Estate',
      'area': 25.5,
      'plantingDate': '2020-01-01T00:00:00.000Z',
      'isActive': true,
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }
}

/// Custom matchers for testing
class AppMatchers {
  /// Matcher for checking if widget has specific text
  static Matcher hasText(String text) => _HasTextMatcher(text);

  /// Matcher for checking if widget is enabled
  static Matcher get isEnabled => _IsEnabledMatcher();

  /// Matcher for checking if widget is disabled
  static Matcher get isDisabled => _IsDisabledMatcher();

  /// Matcher for checking if loading is shown
  static Matcher get showsLoading => findsOneWidget;

  /// Matcher for checking error state
  static Matcher get showsError => _ShowsErrorMatcher();
}

class _HasTextMatcher extends Matcher {
  final String expectedText;

  const _HasTextMatcher(this.expectedText);

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Widget) {
      return item.toString().contains(expectedText);
    }
    return false;
  }

  @override
  Description describe(Description description) {
    return description.add('has text "$expectedText"');
  }
}

class _IsEnabledMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Widget) {
      // Check common button types
      if (item is ElevatedButton) {
        return item.onPressed != null;
      }
      if (item is TextButton) {
        return item.onPressed != null;
      }
      if (item is OutlinedButton) {
        return item.onPressed != null;
      }
      if (item is IconButton) {
        return item.onPressed != null;
      }
    }
    return false;
  }

  @override
  Description describe(Description description) {
    return description.add('is enabled');
  }
}

class _IsDisabledMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    return !_IsEnabledMatcher().matches(item, matchState);
  }

  @override
  Description describe(Description description) {
    return description.add('is disabled');
  }
}

class _ShowsErrorMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    // Look for common error indicators
    return find.byIcon(Icons.error).evaluate().isNotEmpty ||
           find.byIcon(Icons.error_outline).evaluate().isNotEmpty ||
           find.textContaining('error', ignoreCase: true).evaluate().isNotEmpty ||
           find.textContaining('kesalahan', ignoreCase: true).evaluate().isNotEmpty;
  }

  @override
  Description describe(Description description) {
    return description.add('shows error state');
  }
}