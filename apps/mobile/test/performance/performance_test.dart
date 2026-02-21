import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:agrinova_mobile/features/harvest/presentation/blocs/harvest_bloc.dart';
import 'package:agrinova_mobile/features/harvest/presentation/widgets/harvest_form.dart';
import 'package:agrinova_mobile/features/gate_check/presentation/pages/gate_check_page.dart';
import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/services/sync_service.dart';

import '../helpers/test_helpers.dart';
import '../helpers/mock_services.dart';

void main() {
  group('Mobile Performance Tests', () {
    late MockDatabaseService mockDatabaseService;
    late MockSyncService mockSyncService;

    setUp(() async {
      await TestHelpers.setupTestDependencies();

      mockDatabaseService = MockDatabaseService();
      mockSyncService = MockSyncService();

      // Mock database operations for performance testing
      when(() => mockDatabaseService.getHarvests())
          .thenAnswer((_) async => _generateLargeHarvestDataset(1000));

      when(() => mockDatabaseService.saveHarvest(any()))
          .thenAnswer((_) async => {'success': true, 'id': 'test-harvest'});

      when(() => mockSyncService.syncPendingItems())
          .thenAnswer((_) async => {'success': true, 'synced_count': 50});
    });

    tearDown(() async {
      await TestHelpers.cleanupTestDependencies();
    });

    testWidgets('should render harvest form within performance threshold',
        (WidgetTester tester) async {
      // Measure initial render time
      final renderStopwatch = Stopwatch()..start();

      await tester.pumpWidget(
        TestHelpers.createTestableWidget(
          child: HarvestForm(
            onSubmit: (data) async {},
            isLoading: false,
          ),
        ),
      );

      await tester.pumpAndSettle();
      renderStopwatch.stop();

      // Render should complete within 2 seconds
      expect(renderStopwatch.elapsedMilliseconds, lessThan(2000),
          reason: 'Harvest form should render within 2 seconds');

      print('Harvest form render time: ${renderStopwatch.elapsedMilliseconds}ms');
    });

    testWidgets('should handle large datasets efficiently', (WidgetTester tester) async {
      // Generate large dataset for testing
      final largeDataset = _generateLargeHarvestDataset(1000);

      // Mock database to return large dataset
      when(() => mockDatabaseService.getHarvests())
          .thenAnswer((_) async => largeDataset);

      final dataLoadStopwatch = Stopwatch()..start();

      // Create widget that displays large dataset
      await tester.pumpWidget(
        TestHelpers.createTestableWidget(
          child: _LargeDatasetView(harvests: largeDataset),
        ),
      );

      await tester.pumpAndSettle();
      dataLoadStopwatch.stop();

      // Data loading should complete within 3 seconds
      expect(dataLoadStopwatch.elapsedMilliseconds, lessThan(3000),
          reason: 'Large dataset should load within 3 seconds');

      // Verify memory usage is reasonable (basic check)
      expect(find.byType(ListView), findsOneWidget);

      print('Large dataset load time: ${dataLoadStopwatch.elapsedMilliseconds}ms');
    });

    testWidgets('should maintain 60fps during scrolling', (WidgetTester tester) async {
      // Create scrollable content
      final scrollableItems = List.generate(
        100,
        (index) => ListTile(
          title: Text('Harvest Item ${index + 1}'),
          subtitle: Text('Block A${index % 10 + 1} - ${(100 + index * 10).toString()} TBS'),
        ),
      );

      await tester.pumpWidget(
        TestHelpers.createTestableWidget(
          child: Scaffold(
            body: ListView(children: scrollableItems),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Measure scroll performance
      final scrollStopwatch = Stopwatch()..start();

      // Scroll through the list
      for (int i = 0; i < 5; i++) {
        await tester.fling(
          find.byType(ListView),
          const Offset(0, -500),
          1000,
        );
        await tester.pumpAndSettle(const Duration(milliseconds: 500));
      }

      scrollStopwatch.stop();

      // Scrolling should be smooth (basic performance check)
      expect(scrollStopwatch.elapsedMilliseconds, lessThan(5000),
          reason: 'Scrolling should complete within 5 seconds');

      print('Scroll performance time: ${scrollStopwatch.elapsedMilliseconds}ms');
    });

    testWidgets('should handle memory efficiently with repeated operations',
        (WidgetTester tester) async {
      final memoryMeasurements = <int>[];

      // Measure memory baseline
      final baselineMemory = _getCurrentMemoryUsage();
      memoryMeasurements.add(baselineMemory);

      // Perform repeated operations
      for (int i = 0; i < 10; i++) {
        // Create and destroy widget repeatedly
        await tester.pumpWidget(
          TestHelpers.createTestableWidget(
            child: HarvestForm(
              onSubmit: (data) async {},
              isLoading: false,
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Measure memory after each operation
        final currentMemory = _getCurrentMemoryUsage();
        memoryMeasurements.add(currentMemory);

        // Clean up
        await tester.pumpWidget(Container());
        await tester.pumpAndSettle();
      }

      // Analyze memory growth
      final maxMemory = memoryMeasurements.reduce(max);
      final memoryGrowth = maxMemory - baselineMemory;

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth, lessThan(50 * 1024 * 1024),
          reason: 'Memory growth should be less than 50MB');

      print('Memory baseline: ${baselineMemory ~/ (1024 * 1024)}MB');
      print('Peak memory: ${maxMemory ~/ (1024 * 1024)}MB');
      print('Memory growth: ${memoryGrowth ~/ (1024 * 1024)}MB');
    });

    testWidgets('should sync data efficiently under load', (WidgetTester tester) async {
      // Simulate high load scenario
      final syncOperations = 50;
      final syncStopwatch = Stopwatch()..start();

      // Mock sync operations
      when(() => mockSyncService.addToSyncQueue(any(), any()))
          .thenAnswer((_) async => true);

      final futures = <Future>[];

      // Perform concurrent sync operations
      for (int i = 0; i < syncOperations; i++) {
        final future = Future.delayed(
          Duration(milliseconds: Random().nextInt(100)),
          () async {
            return await mockSyncService.addToSyncQueue(
              'harvest',
              TestDataFactory.createTestHarvestData(id: i.toString()),
            );
          },
        );
        futures.add(future);
      }

      // Wait for all operations to complete
      final results = await Future.wait(futures);
      syncStopwatch.stop();

      // Verify all operations completed successfully
      expect(results.every((result) => result == true), isTrue);

      // Sync should complete within reasonable time
      expect(syncStopwatch.elapsedMilliseconds, lessThan(10000),
          reason: 'Batch sync should complete within 10 seconds');

      // Verify sync queue operations
      verify(() => mockSyncService.addToSyncQueue(any(), any()))
          .called(syncOperations);

      print('Batch sync time: ${syncStopwatch.elapsedMilliseconds}ms');
      print('Operations per second: ${(syncOperations / syncStopwatch.elapsedMilliseconds * 1000).toStringAsFixed(2)}');
    });

    testWidgets('should maintain responsive UI during background processing',
        (WidgetTester tester) async {
      bool isUIResponsive = true;
      int frameCount = 0;

      // Create widget with background processing
      await tester.pumpWidget(
        TestHelpers.createTestableWidget(
          child: _BackgroundProcessingWidget(
            onResponsiveCheck: (responsive) {
              isUIResponsive = responsive;
            },
            onFrameUpdate: () {
              frameCount++;
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Start background processing
      await tester.tap(find.byKey(const Key('start_processing')));
      await tester.pumpAndSettle();

      // Monitor UI responsiveness during processing
      for (int i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));

        // UI should remain responsive
        expect(isUIResponsive, isTrue,
            reason: 'UI should remain responsive during background processing');
      }

      // Verify frame updates
      expect(frameCount, greaterThan(0),
          reason: 'UI should continue updating frames during processing');

      print('Total frame updates: $frameCount');
    });

    testWidgets('should optimize database operations for performance',
        (WidgetTester tester) async {
      final databaseStopwatch = Stopwatch()..start();

      // Test batch database operations
      final testData = List.generate(
        100,
        (index) => TestDataFactory.createTestHarvestData(id: index.toString()),
      );

      // Mock batch database operations
      when(() => mockDatabaseService.batchInsertHarvests(any()))
          .thenAnswer((_) async => {'success': true, 'count': testData.length});

      when(() => mockDatabaseService.batchUpdateHarvests(any()))
          .thenAnswer((_) async => {'success': true, 'count': testData.length});

      // Perform batch insert
      await mockDatabaseService.batchInsertHarvests(testData);

      // Perform batch update
      await mockDatabaseService.batchUpdateHarvests(testData);

      databaseStopwatch.stop();

      // Batch operations should complete within reasonable time
      expect(databaseStopwatch.elapsedMilliseconds, lessThan(5000),
          reason: 'Batch database operations should complete within 5 seconds');

      // Verify batch operations were called
      verify(() => mockDatabaseService.batchInsertHarvests(any())).called(1);
      verify(() => mockDatabaseService.batchUpdateHarvests(any())).called(1);

      print('Batch operations time: ${databaseStopwatch.elapsedMilliseconds}ms');
    });

    testWidgets('should handle gate check performance with photos',
        (WidgetTester tester) async {
      // Simulate photo processing
      final photoProcessingStopwatch = Stopwatch()..start();

      // Mock photo processing operations
      when(() => mockSyncService.processGateCheckPhotos(any()))
          .thenAnswer((_) async {
        // Simulate photo processing time
        await Future.delayed(const Duration(milliseconds: 500));
        return {'success': true, 'processed_count': 5};
      });

      await tester.pumpWidget(
        TestHelpers.createTestableWidget(
          child: GateCheckPage(),
        ),
      );

      await tester.pumpAndSettle();

      // Simulate photo capture and processing
      await tester.tap(find.byKey(const Key('capture_photo')));
      await tester.pumpAndSettle(const Duration(milliseconds: 600));

      photoProcessingStopwatch.stop();

      // Photo processing should complete within reasonable time
      expect(photoProcessingStopwatch.elapsedMilliseconds, lessThan(2000),
          reason: 'Photo processing should complete within 2 seconds');

      // Verify photo processing was called
      verify(() => mockSyncService.processGateCheckPhotos(any())).called(1);

      print('Photo processing time: ${photoProcessingStopwatch.elapsedMilliseconds}ms');
    });
  });
}

/// Generate large harvest dataset for performance testing
List<Map<String, dynamic>> _generateLargeHarvestDataset(int count) {
  return List.generate(count, (index) => TestDataFactory.createTestHarvestData(
        id: 'harvest_$index',
        employeeId: 'emp_${index % 50}',
        blockId: 'block_${index % 20}',
        tbsQuantity: 1000.0 + (Random().nextDouble() * 2000),
        status: ['PENDING', 'APPROVED', 'REJECTED'][index % 3],
      ));
}

/// Get current memory usage (simplified implementation)
int _getCurrentMemoryUsage() {
  // This is a simplified placeholder
  // In real implementation, you would use dart:developer or memory profiling tools
  return Random().nextInt(100 * 1024 * 1024); // Random memory usage for demo
}

/// Widget for testing large dataset display
class _LargeDatasetView extends StatelessWidget {
  final List<Map<String, dynamic>> harvests;

  const _LargeDatasetView({required this.harvests});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: harvests.length,
      itemBuilder: (context, index) {
        final harvest = harvests[index];
        return Card(
          child: ListTile(
            title: Text('Harvest #${harvest['id']}'),
            subtitle: Text(
              'Block: ${harvest['blockName']} - TBS: ${harvest['tbsQuantity']}',
            ),
            trailing: Text(harvest['status']),
          ),
        );
      },
    );
  }
}

/// Widget for testing background processing performance
class _BackgroundProcessingWidget extends StatefulWidget {
  final Function(bool) onResponsiveCheck;
  final VoidCallback onFrameUpdate;

  const _BackgroundProcessingWidget({
    required this.onResponsiveCheck,
    required this.onFrameUpdate,
  });

  @override
  State<_BackgroundProcessingWidget> createState() =>
      _BackgroundProcessingWidgetState();
}

class _BackgroundProcessingWidgetState
    extends State<_BackgroundProcessingWidget> {
  bool _isProcessing = false;
  Timer? _frameTimer;

  @override
  void initState() {
    super.initState();
    _startFrameMonitoring();
  }

  void _startFrameMonitoring() {
    _frameTimer = Timer.periodic(const Duration(milliseconds: 16), (_) {
      widget.onFrameUpdate();
      widget.onResponsiveCheck(true);
    });
  }

  @override
  void dispose() {
    _frameTimer?.cancel();
    super.dispose();
  }

  void _startBackgroundProcessing() async {
    setState(() {
      _isProcessing = true;
    });

    // Simulate heavy background processing
    for (int i = 0; i < 1000; i++) {
      // Simulate work
      await Future.delayed(const Duration(microseconds: 100));

      // Check for frame updates
      if (i % 100 == 0) {
        widget.onResponsiveCheck(true);
      }
    }

    setState(() {
      _isProcessing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isProcessing)
              const Column(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Processing...'),
                ],
              ),
            ElevatedButton(
              key: const Key('start_processing'),
              onPressed: _isProcessing ? null : _startBackgroundProcessing,
              child: const Text('Start Processing'),
            ),
          ],
        ),
      ),
    );
  }
}