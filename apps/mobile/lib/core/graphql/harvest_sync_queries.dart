class HarvestSyncQueries {
  /// Push local harvest records to server (CREATE/UPDATE)
  static const String syncHarvestRecords = r'''
    mutation SyncHarvestRecords($input: HarvestSyncInput!) {
      syncHarvestRecords(input: $input) {
        success
        transactionId
        recordsProcessed
        recordsSuccessful
        recordsFailed
        conflictsDetected
        message
        serverTimestamp
        results {
          localId
          serverId
          success
          error
        }
      }
    }
  ''';

  /// Pull server updates (approval status changes) for MANDOR's harvest records
  /// Used to sync approval/rejection status from ASISTEN back to mobile
  static const String pullServerUpdates = r'''
    query MandorServerUpdates($since: Time!, $deviceId: String!) {
      mandorServerUpdates(since: $since, deviceId: $deviceId) {
        id
        localId
        tanggal
        mandorId
        mandorName
        blockId
        blockName
        divisionId
        divisionName
        estateId
        estateName
        karyawan
        jumlahJanjang
        beratTbs
        status
        approvedBy
        approvedByName
        approvedAt
        rejectedReason
        createdAt
        updatedAt
        syncStatus
        serverVersion
      }
    }
  ''';

  /// Get sync status for MANDOR
  static const String getMandorSyncStatus = r'''
    query MandorSyncStatus {
      mandorSyncStatus {
        lastSyncAt
        pendingUploads
        pendingDownloads
        lastError
        isOnline
      }
    }
  ''';
}
