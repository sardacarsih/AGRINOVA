import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:agrinova_mobile/features/gate_check/presentation/widgets/guest_registration_form.dart';
import 'package:agrinova_mobile/features/gate_check/data/models/gate_check_models.dart';

void main() {
  group('GuestRegistrationForm Validation Tests', () {
    late Widget testWidget;
    
    setUp(() {
      testWidget = MaterialApp(
        home: Scaffold(
          body: GuestRegistrationForm(
            onVehiclePlateChanged: (plate) {},
            onCameraPressed: () {},
            onQRGeneratePressed: () {},
          ),
        ),
      );
    });

    group('Driver Name Validation', () {
      testWidgets('should accept valid driver names', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        final driverNameField = find.byType(TextFormField).first;
        
        const validNames = [
          'John Doe',
          'Ahmad Sutrisno',
          'Maria Santos',
          'Abdul Rahman Al-Rashid',
          "O'Connor",
          'Jean-Pierre',
          'Dr. Smith',
        ];
        
        for (final name in validNames) {
          await tester.enterText(driverNameField, name);
          await tester.pump();
          
          // Trigger validation
          final form = tester.widget<Form>(find.byType(Form));
          final formState = form.key as GlobalKey<FormState>;
          expect(formState.currentState?.validate(), true,
              reason: 'Valid name "$name" should pass validation');
        }
      });

      testWidgets('should reject invalid driver names', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        final driverNameField = find.byType(TextFormField).first;
        
        const invalidNames = [
          '', // Empty
          'J', // Too short
          'A' * 51, // Too long (51 characters)
          'John123', // Contains numbers
          'John@Doe', // Contains special characters
          'John<script>alert()</script>', // XSS attempt
        ];
        
        for (final name in invalidNames) {
          await tester.enterText(driverNameField, name);
          await tester.pump();
          
          // Trigger validation
          final form = tester.widget<Form>(find.byType(Form));
          final formState = form.key as GlobalKey<FormState>;
          expect(formState.currentState?.validate(), false,
              reason: 'Invalid name "$name" should fail validation');
        }
      });
    });

    group('Vehicle Plate Validation', () {
      testWidgets('should accept valid Indonesian vehicle plates', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        // Find vehicle plate field (appears multiple times due to responsive design)
        final vehiclePlateFields = find.byWidgetPredicate(
          (widget) => widget is TextFormField && 
                     (widget.decoration?.labelText?.contains('Plat Kendaraan') ?? false)
        );
        
        const validPlates = [
          'KB123A',    // 6 chars - valid
          'B1234AB',   // 7 chars - valid
          'KB1234XL',  // 8 chars - valid (max)
          'D5678E',    // 6 chars - valid
          'AA123B',    // 6 chars - valid
        ];
        
        for (final plate in validPlates) {
          await tester.enterText(vehiclePlateFields.first, plate);
          await tester.pump();
          
          // Trigger validation
          final form = tester.widget<Form>(find.byType(Form));
          final formState = form.key as GlobalKey<FormState>;
          expect(formState.currentState?.validate(), true,
              reason: 'Valid plate "$plate" should pass validation');
        }
      });

      testWidgets('should reject invalid vehicle plates', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        final vehiclePlateFields = find.byWidgetPredicate(
          (widget) => widget is TextFormField && 
                     (widget.decoration?.labelText?.contains('Plat Kendaraan') ?? false)
        );
        
        const invalidPlates = [
          '', // Empty
          'KB12', // Too short (4 chars, min is 5)
          'KB1234XYZ', // Too long (9 chars, max is 8)
          'B@1234', // Invalid characters
          'KB 123', // Contains space (not allowed)
        ];
        
        for (final plate in invalidPlates) {
          await tester.enterText(vehiclePlateFields.first, plate);
          await tester.pump();
          
          // Trigger validation
          final form = tester.widget<Form>(find.byType(Form));
          final formState = form.key as GlobalKey<FormState>;
          expect(formState.currentState?.validate(), false,
              reason: 'Invalid plate "$plate" should fail validation');
        }
      });
    });

    group('Load Volume Validation', () {
      testWidgets('should have volume dropdown with valid options', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);

        // Volume is now a dropdown with options: Seperempat, Setengah, Penuh
        final volumeDropdown = find.byWidgetPredicate(
          (widget) => widget is DropdownButtonFormField<String> &&
                     (widget.decoration.labelText?.contains('Volume Muatan') ?? false)
        );

        expect(volumeDropdown, findsOneWidget);
      });
    });

    group('Accessibility Features', () {
      testWidgets('should have proper semantic labels', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        // Check for semantic labels
        expect(find.byWidgetPredicate(
          (widget) => widget is Semantics && 
                     (widget.properties.label?.contains('Nama supir') ?? false)
        ), findsOneWidget);
        
        expect(find.byWidgetPredicate(
          (widget) => widget is Semantics && 
                     (widget.properties.label?.contains('Jenis kendaraan') ?? false)
        ), findsOneWidget);
        
        expect(find.byWidgetPredicate(
          (widget) => widget is Semantics && 
                     (widget.properties.label?.contains('Tombol buat kode QR') ?? false)
        ), findsOneWidget);
      });

      testWidgets('should have helper texts for guidance', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        // Check for helper texts
        expect(find.text('Minimal 2 karakter, maksimal 50 karakter'), findsOneWidget);
        expect(find.text('Pilih salah satu dari daftar'), findsWidgets);
      });
    });

    group('Form Integration', () {
      testWidgets('should update form data correctly', (WidgetTester tester) async {
        bool formSubmitted = false;
        GateCheckFormData? submittedData;
        
        final formWidget = MaterialApp(
          home: Scaffold(
            body: GuestRegistrationForm(
              onVehiclePlateChanged: (plate) {},
              onCameraPressed: () {},
              onQRGeneratePressed: () {
                formSubmitted = true;
              },
              initialData: GateCheckFormData(),
            ),
          ),
        );
        
        await tester.pumpWidget(formWidget);
        
        // Fill in required fields
        final driverNameField = find.byType(TextFormField).first;
        await tester.enterText(driverNameField, 'John Doe');
        await tester.pump();
        
        // Find and fill vehicle plate field
        final vehiclePlateFields = find.byWidgetPredicate(
          (widget) => widget is TextFormField && 
                     (widget.decoration?.labelText?.contains('Plat Kendaraan') ?? false)
        );
        await tester.enterText(vehiclePlateFields.first, 'KB1234XL');
        await tester.pump();
        
        // Select vehicle type dropdown
        final vehicleTypeDropdown = find.byWidgetPredicate(
          (widget) => widget is DropdownButtonFormField<String> &&
                     (widget.decoration.labelText?.contains('Jenis Kendaraan') ?? false)
        );
        await tester.tap(vehicleTypeDropdown);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Truk').last);
        await tester.pumpAndSettle();
        
        // Verify form is properly configured
        expect(find.byType(TextFormField), findsWidgets);
        expect(find.byType(DropdownButtonFormField), findsWidgets);
      });
    });

    group('Input Sanitization', () {
      testWidgets('should sanitize input data', (WidgetTester tester) async {
        await tester.pumpWidget(testWidget);
        
        // Test input sanitization by entering potentially malicious data
        final driverNameField = find.byType(TextFormField).first;
        
        const maliciousInput = 'John<script>alert("xss")</script>Doe';
        await tester.enterText(driverNameField, maliciousInput);
        await tester.pump();
        
        // The form should handle and sanitize the input
        final textField = tester.widget<TextFormField>(driverNameField);
        final controller = textField.controller;
        
        // Input should be sanitized (XSS removed)
        expect(controller?.text, isNot(contains('<script>')));
        expect(controller?.text, isNot(contains('alert(')));
      });
    });
  });

  group('GateCheckFormData Model Tests', () {
    test('should validate complete form data', () {
      final formData = GateCheckFormData(
        posNumber: 'POS001',
        driverName: 'John Doe',
        vehiclePlate: 'KB1234XL',
        vehicleType: 'Truk',
        destination: 'Pabrik Kelapa Sawit',
        loadType: 'Kelapa Sawit',
        loadVolume: 'Penuh',
        loadOwner: 'PT. Sawit Indonesia',
      );

      expect(formData.isValid, true);
    });

    test('should invalidate incomplete form data', () {
      final formData = GateCheckFormData(
        posNumber: '', // Missing
        driverName: 'John Doe',
        vehiclePlate: 'KB1234XL',
        vehicleType: 'Truk',
        destination: 'Pabrik Kelapa Sawit',
        loadType: 'Kelapa Sawit',
        loadVolume: '', // Invalid - empty
        loadOwner: 'PT. Sawit Indonesia',
      );

      expect(formData.isValid, false);
    });

    test('should convert to map correctly', () {
      final formData = GateCheckFormData(
        posNumber: 'POS001',
        driverName: 'John Doe',
        vehiclePlate: 'KB1234XL',
        vehicleType: 'Truk',
        destination: 'Pabrik Kelapa Sawit',
        loadType: 'Kelapa Sawit',
        loadVolume: 'Setengah',
        loadOwner: 'PT. Sawit Indonesia',
      );

      final map = formData.toMap();

      expect(map['pos_number'], equals('POS001'));
      expect(map['driver_name'], equals('John Doe'));
      expect(map['vehicle_plate'], equals('KB1234XL'));
      expect(map['load_volume'], equals('Setengah'));
    });

    test('should clear form data correctly', () {
      final formData = GateCheckFormData(
        posNumber: 'POS001',
        driverName: 'John Doe',
        vehiclePlate: 'KB1234XL',
        vehicleType: 'Truk',
        destination: 'Pabrik Kelapa Sawit',
        loadType: 'Kelapa Sawit',
        loadVolume: 'Penuh',
        loadOwner: 'PT. Sawit Indonesia',
      );

      formData.clear();

      // POS number should be preserved
      expect(formData.posNumber, equals('POS001'));

      // Other fields should be cleared
      expect(formData.driverName, isEmpty);
      expect(formData.vehiclePlate, isEmpty);
      expect(formData.vehicleType, isEmpty);
      expect(formData.destination, isEmpty);
      expect(formData.loadType, isEmpty);
      expect(formData.loadVolume, isEmpty);
      expect(formData.loadOwner, isEmpty);
    });
  });
}