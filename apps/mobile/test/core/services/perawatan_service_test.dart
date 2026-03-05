import 'package:agrinova_mobile/core/services/perawatan_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PerawatanRecordDraft', () {
    test('toCreateInput trims required fields and nulls empty optional fields', () {
      final draft = PerawatanRecordDraft(
        blockId: '  block-1  ',
        jenisPerawatan: '  PEMUPUKAN  ',
        tanggalPerawatan: DateTime.utc(2026, 3, 2, 10, 30),
        pekerjaId: '  user-1  ',
        luasArea: 2.5,
        pupukDigunakan: '  ',
        herbisidaDigunakan: '  Glyphosate  ',
        catatan: '',
      );

      final input = draft.toCreateInput();

      expect(input['blockId'], 'block-1');
      expect(input['jenisPerawatan'], 'PEMUPUKAN');
      expect(input['pekerjaId'], 'user-1');
      expect(input['luasArea'], 2.5);
      expect(input['pupukDigunakan'], isNull);
      expect(input['herbisidaDigunakan'], 'Glyphosate');
      expect(input['catatan'], isNull);
      expect(
        input['tanggalPerawatan'],
        DateTime.utc(2026, 3, 2, 10, 30).toIso8601String(),
      );
    });
  });

  group('PerawatanRecordUpdateDraft', () {
    test('toUpdateInput trims and includes update id', () {
      final draft = PerawatanRecordUpdateDraft(
        jenisPerawatan: '  PEMANGKASAN  ',
        tanggalPerawatan: DateTime.utc(2026, 3, 1, 8, 0),
        luasArea: 1.25,
        pupukDigunakan: '  Urea  ',
        herbisidaDigunakan: '',
        catatan: '  catatan test  ',
        status: '  IN_PROGRESS  ',
      );

      final input = draft.toUpdateInput('  rec-1  ');

      expect(input['id'], 'rec-1');
      expect(input['jenisPerawatan'], 'PEMANGKASAN');
      expect(input['luasArea'], 1.25);
      expect(input['pupukDigunakan'], 'Urea');
      expect(input['herbisidaDigunakan'], isNull);
      expect(input['catatan'], 'catatan test');
      expect(input['status'], 'IN_PROGRESS');
      expect(
        input['tanggalPerawatan'],
        DateTime.utc(2026, 3, 1, 8, 0).toIso8601String(),
      );
    });
  });
}
