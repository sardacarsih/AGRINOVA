import 'package:flutter_test/flutter_test.dart';

import 'package:agrinova_mobile/core/graphql/harvest_sync_queries.dart';
import 'package:agrinova_mobile/core/graphql/mandor_master_sync_queries.dart';

void main() {
  group('Mandor sync contract tests', () {
    test('syncHarvestRecords mutation exposes per-record result fields', () {
      final query = HarvestSyncQueries.syncHarvestRecords;

      expect(query, contains('mutation SyncHarvestRecords'));
      expect(query, contains('syncHarvestRecords(input: \$input)'));

      // Required by HarvestSyncService._processPerRecordResults().
      expect(query, contains('results'));
      expect(query, contains('localId'));
      expect(query, contains('serverId'));
      expect(query, contains('success'));
      expect(query, contains('error'));
    });

    test('pullServerUpdates query requests approval status fields', () {
      final query = HarvestSyncQueries.pullServerUpdates;

      expect(query, contains('query MandorServerUpdates'));
      expect(
          query,
          contains(
              'mandorServerUpdates(since: \$since, deviceId: \$deviceId)'));

      // Required by local status reconciliation logic.
      expect(query, contains('id'));
      expect(query, contains('localId'));
      expect(query, contains('status'));
      expect(query, contains('approvedBy'));
      expect(query, contains('approvedAt'));
      expect(query, contains('rejectedReason'));
      expect(query, contains('updatedAt'));
    });

    test('master sync server updates query keeps harvest identifiers', () {
      final query = MandorMasterSyncQueries.getServerUpdates;

      expect(query, contains('query MandorServerUpdates'));
      expect(
          query,
          contains(
              'mandorServerUpdates(since: \$since, deviceId: \$deviceId)'));

      // MandorMasterSyncService now matches by harvest_id and/or server_id.
      expect(query, contains('id'));
      expect(query, contains('localId'));
      expect(query, contains('status'));
      expect(query, contains('approvedBy'));
      expect(query, contains('approvedAt'));
      expect(query, contains('rejectedReason'));
    });
  });
}
