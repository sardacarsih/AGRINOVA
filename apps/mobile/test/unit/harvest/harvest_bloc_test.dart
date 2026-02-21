import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:agrinova_mobile/features/harvest/presentation/blocs/harvest_bloc.dart';
import 'package:agrinova_mobile/features/harvest/domain/entities/harvest_entity.dart';
import 'package:agrinova_mobile/features/harvest/data/repositories/harvest_repository.dart';
import 'package:agrinova_mobile/core/error/app_error.dart';

import '../../helpers/mock_services.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('HarvestBloc', () {
    late HarvestBloc harvestBloc;
    late MockHarvestRepository mockHarvestRepository;

    setUp(() {
      mockHarvestRepository = MockHarvestRepository();
      harvestBloc = HarvestBloc(repository: mockHarvestRepository);
      
      // Configure default mock behaviors
      MockBehaviorConfig.configureHarvestRepository(mockHarvestRepository);
    });

    tearDown(() {
      harvestBloc.close();
    });

    group('HarvestListRequested', () {
      const testHarvest = Harvest(
        id: 'harvest-001',
        employeeId: 'emp-001',
        employeeName: 'John Doe',
        employeeCode: 'EMP001',
        blockId: 'block-001',
        blockName: 'Block A1',
        divisionId: 'div-001',
        divisionName: 'Division 1',
        estateId: 'estate-001',
        estateName: 'Estate One',
        companyId: 'company-001',
        companyName: 'Test Company',
        tbsQuantity: 1500.0,
        qualityGrade: 'A',
        harvestDate: '2024-01-15T08:00:00.000Z',
        notes: 'Test harvest notes',
        photos: ['photo1.jpg', 'photo2.jpg'],
        location: {
          'latitude': -6.2088,
          'longitude': 106.8456,
          'accuracy': 5.0,
        },
        status: 'PENDING',
        createdBy: 'mandor-001',
        createdAt: '2024-01-15T08:00:00.000Z',
        updatedAt: '2024-01-15T08:00:00.000Z',
        syncStatus: 'PENDING',
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestLoading, HarvestLoaded] when successful',
        build: () {
          when(() => mockHarvestRepository.getAllHarvests())
              .thenAnswer((_) async => [MockDataProvider.mockHarvestData]);
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestListRequested()),
        expect: () => [
          HarvestLoading(),
          const HarvestLoaded([testHarvest]),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.getAllHarvests()).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestLoading, HarvestError] when repository throws error',
        build: () {
          when(() => mockHarvestRepository.getAllHarvests())
              .thenThrow(NetworkError.noConnection());
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestListRequested()),
        expect: () => [
          HarvestLoading(),
          const HarvestError('Tidak ada koneksi internet. Periksa koneksi Anda.'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.getAllHarvests()).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits filtered results when status filter is applied',
        build: () {
          when(() => mockHarvestRepository.getAllHarvests(status: 'APPROVED'))
              .thenAnswer((_) async => []);
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestListRequested(status: 'APPROVED')),
        expect: () => [
          HarvestLoading(),
          const HarvestLoaded([]),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.getAllHarvests(status: 'APPROVED')).called(1);
        },
      );
    });

    group('HarvestSubmitted', () {
      const testHarvest = Harvest(
        id: '',
        employeeId: 'emp-001',
        employeeName: 'John Doe',
        employeeCode: 'EMP001',
        blockId: 'block-001',
        blockName: 'Block A1',
        divisionId: 'div-001',
        divisionName: 'Division 1',
        estateId: 'estate-001',
        estateName: 'Estate One',
        companyId: 'company-001',
        companyName: 'Test Company',
        tbsQuantity: 1500.0,
        qualityGrade: 'A',
        harvestDate: '2024-01-15T08:00:00.000Z',
        notes: 'Test harvest notes',
        photos: [],
        location: {},
        status: 'PENDING',
        createdBy: 'mandor-001',
        createdAt: '2024-01-15T08:00:00.000Z',
        updatedAt: '2024-01-15T08:00:00.000Z',
        syncStatus: 'PENDING',
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestSubmitting, HarvestSubmitSuccess] when successful',
        build: () {
          when(() => mockHarvestRepository.createHarvest(any()))
              .thenAnswer((_) async => 'harvest-001');
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestSubmitted(testHarvest)),
        expect: () => [
          HarvestSubmitting(),
          const HarvestSubmitSuccess('Panen berhasil disimpan'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.createHarvest(testHarvest)).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestSubmitting, HarvestError] when validation fails',
        build: () {
          when(() => mockHarvestRepository.createHarvest(any()))
              .thenThrow(ValidationError.required('Employee'));
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestSubmitted(testHarvest)),
        expect: () => [
          HarvestSubmitting(),
          const HarvestError('Employee harus diisi'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.createHarvest(testHarvest)).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestSubmitting, HarvestError] when network error occurs',
        build: () {
          when(() => mockHarvestRepository.createHarvest(any()))
              .thenThrow(NetworkError.timeout());
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestSubmitted(testHarvest)),
        expect: () => [
          HarvestSubmitting(),
          const HarvestError('Koneksi timeout. Coba lagi dalam beberapa saat.'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.createHarvest(testHarvest)).called(1);
        },
      );
    });

    group('HarvestUpdated', () {
      const testHarvest = Harvest(
        id: 'harvest-001',
        employeeId: 'emp-001',
        employeeName: 'John Doe',
        employeeCode: 'EMP001',
        blockId: 'block-001',
        blockName: 'Block A1',
        divisionId: 'div-001',
        divisionName: 'Division 1',
        estateId: 'estate-001',
        estateName: 'Estate One',
        companyId: 'company-001',
        companyName: 'Test Company',
        tbsQuantity: 2000.0, // Updated quantity
        qualityGrade: 'B', // Updated grade
        harvestDate: '2024-01-15T08:00:00.000Z',
        notes: 'Updated notes',
        photos: [],
        location: {},
        status: 'PENDING',
        createdBy: 'mandor-001',
        createdAt: '2024-01-15T08:00:00.000Z',
        updatedAt: '2024-01-15T08:30:00.000Z',
        syncStatus: 'PENDING',
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestUpdating, HarvestUpdateSuccess] when successful',
        build: () {
          when(() => mockHarvestRepository.updateHarvest(any()))
              .thenAnswer((_) async {});
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestUpdated(testHarvest)),
        expect: () => [
          HarvestUpdating(),
          const HarvestUpdateSuccess('Panen berhasil diperbarui'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.updateHarvest(testHarvest)).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestUpdating, HarvestError] when harvest is already approved',
        build: () {
          when(() => mockHarvestRepository.updateHarvest(any()))
              .thenThrow(BusinessError.harvestAlreadyApproved('harvest-001'));
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestUpdated(testHarvest)),
        expect: () => [
          HarvestUpdating(),
          const HarvestError('Panen sudah disetujui dan tidak dapat diubah'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.updateHarvest(testHarvest)).called(1);
        },
      );
    });

    group('HarvestDeleted', () {
      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestDeleting, HarvestDeleteSuccess] when successful',
        build: () {
          when(() => mockHarvestRepository.deleteHarvest(any()))
              .thenAnswer((_) async {});
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestDeleted('harvest-001')),
        expect: () => [
          HarvestDeleting(),
          const HarvestDeleteSuccess('Panen berhasil dihapus'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.deleteHarvest('harvest-001')).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestDeleting, HarvestError] when harvest not found',
        build: () {
          when(() => mockHarvestRepository.deleteHarvest(any()))
              .thenThrow(BusinessError.resourceNotFound('Harvest', 'harvest-001'));
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestDeleted('harvest-001')),
        expect: () => [
          HarvestDeleting(),
          const HarvestError('Harvest dengan ID harvest-001 tidak ditemukan'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.deleteHarvest('harvest-001')).called(1);
        },
      );
    });

    group('HarvestPhotoAdded', () {
      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestPhotoAdding, HarvestPhotoAddSuccess] when successful',
        build: () {
          when(() => mockHarvestRepository.captureHarvestPhoto())
              .thenAnswer((_) async => 'photo123.jpg');
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestPhotoAdded('harvest-001')),
        expect: () => [
          HarvestPhotoAdding(),
          const HarvestPhotoAddSuccess('photo123.jpg'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.captureHarvestPhoto()).called(1);
        },
      );

      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestPhotoAdding, HarvestError] when camera not available',
        build: () {
          when(() => mockHarvestRepository.captureHarvestPhoto())
              .thenThrow(DeviceError.cameraNotAvailable());
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const HarvestPhotoAdded('harvest-001')),
        expect: () => [
          HarvestPhotoAdding(),
          const HarvestError('Kamera tidak tersedia atau tidak dapat diakses'),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.captureHarvestPhoto()).called(1);
        },
      );
    });

    group('EmployeesRequested', () {
      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestLoading, EmployeesLoaded] when successful',
        build: () {
          when(() => mockHarvestRepository.getEmployees())
              .thenAnswer((_) async => MockDataProvider.mockEmployeeList);
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const EmployeesRequested()),
        expect: () => [
          HarvestLoading(),
          EmployeesLoaded(MockDataProvider.mockEmployeeList),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.getEmployees()).called(1);
        },
      );
    });

    group('BlocksRequested', () {
      blocTest<HarvestBloc, HarvestState>(
        'emits [HarvestLoading, BlocksLoaded] when successful',
        build: () {
          when(() => mockHarvestRepository.getBlocks())
              .thenAnswer((_) async => MockDataProvider.mockBlockList);
          return harvestBloc;
        },
        act: (bloc) => bloc.add(const BlocksRequested()),
        expect: () => [
          HarvestLoading(),
          BlocksLoaded(MockDataProvider.mockBlockList),
        ],
        verify: (_) {
          verify(() => mockHarvestRepository.getBlocks()).called(1);
        },
      );
    });
  });
}