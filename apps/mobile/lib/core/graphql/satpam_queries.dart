import 'package:graphql_flutter/graphql_flutter.dart';

/// GraphQL queries and mutations for Satpam sync operations
class SatpamQueries {
  /// Satpam server updates query - pull updates from server since last sync
  static const String satpamServerUpdatesQuery = r'''
    query SatpamServerUpdates($since: Time!, $deviceId: String!) {
      satpamServerUpdates(since: $since, deviceId: $deviceId) {
        id
        localId
        idCardNumber
        driverName
        vehiclePlate
        vehicleType
        destination
        gatePosition
        entryTime
        exitTime
        entryGate
        exitGate
        generationIntent
        registrationSource
        loadType
        cargoVolume
        cargoOwner
        estimatedWeight
        deliveryOrderNumber
        notes
        photoUrl
        qrCodeData
        createdBy
        createdAt
        secondCargo
        latitude
        longitude
        deviceId
        syncStatus
      }
    }
  ''';

  /// Satpam sync status query
  static const String satpamSyncStatusQuery = r'''
    query SatpamSyncStatus {
      satpamSyncStatus {
        isOnline
        lastSyncAt
        pendingSyncCount
        failedSyncCount
        photosPendingUpload
        lastSyncResult
      }
    }
  ''';

  /// Sync satpam records mutation - push local records to server
  static const String syncSatpamRecordsMutation = r'''
    mutation SyncSatpamRecords($input: SatpamSyncInput!) {
      syncSatpamRecords(input: $input) {
        success
        transactionId
        guestLogsProcessed
        guestLogsSuccessful
        guestLogsFailed
        qrTokensProcessed
        qrTokensSuccessful
        conflictsDetected
        results {
          id
          recordType
          serverId
          success
          serverVersion
          error
          hasConflict
        }
        serverTimestamp
        message
      }
    }
  ''';

  /// Sync satpam photos mutation
  static const String syncSatpamPhotosMutation = r'''
    mutation SyncSatpamPhotos($input: SatpamPhotoSyncInput!) {
      syncSatpamPhotos(input: $input) {
        photosProcessed
        successfulUploads
        failedUploads
        totalBytesUploaded
        errors {
          photoId
          error
          code
        }
        syncedAt
      }
    }
  ''';

  /// Get pending sync items query
  static const String satpamPendingSyncItemsQuery = r'''
    query SatpamPendingSyncItems($deviceId: String!) {
      satpamPendingSyncItems(deviceId: $deviceId) {
        id
        serverId
        operation
        data {
          id
          driverName
          vehiclePlate
          vehicleType
          destination

          cargoVolume
          cargoOwner
          estimatedWeight
          deliveryOrderNumber
          gatePosition
          notes
          latitude
          longitude
          idCardNumber
          secondCargo
        }
        localVersion
        lastUpdated
        photoIds
      }
    }
  ''';

  /// Device-scoped satpam sync status updates subscription
  static const String satpamSyncUpdateSubscription = r'''
    subscription SatpamSyncUpdate($deviceId: String!) {
      satpamSyncUpdate(deviceId: $deviceId) {
        isOnline
        lastSyncAt
        pendingSyncCount
        failedSyncCount
        photosPendingUpload
        lastSyncResult
        uniqueDeviceCount
      }
    }
  ''';

  // Helper methods to create query/mutation options

  /// Create satpam server updates query options
  static QueryOptions satpamServerUpdatesOptions({
    required DateTime since,
    required String deviceId,
  }) {
    return QueryOptions(
      document: gql(satpamServerUpdatesQuery),
      variables: {
        'since': since.toIso8601String(),
        'deviceId': deviceId,
      },
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create satpam sync status query options
  static QueryOptions satpamSyncStatusOptions() {
    return QueryOptions(
      document: gql(satpamSyncStatusQuery),
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create sync satpam records mutation options
  static MutationOptions syncSatpamRecordsOptions({
    required String deviceId,
    required List<Map<String, dynamic>> guestLogs,
    List<Map<String, dynamic>>? qrTokens,
    required DateTime clientTimestamp,
    String? batchId,
    String conflictResolution = 'LATEST_WINS',
  }) {
    return MutationOptions(
      document: gql(syncSatpamRecordsMutation),
      variables: {
        'input': {
          'deviceId': deviceId,
          'guestLogs': guestLogs,
          if (qrTokens != null) 'qrTokens': qrTokens,
          'clientTimestamp': clientTimestamp.toIso8601String(),
          if (batchId != null) 'batchId': batchId,
          'conflictResolution': conflictResolution,
        },
      },
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create sync satpam photos mutation options
  static MutationOptions syncSatpamPhotosOptions({
    required String deviceId,
    required List<Map<String, dynamic>> photos,
    String? batchId,
  }) {
    return MutationOptions(
      document: gql(syncSatpamPhotosMutation),
      variables: {
        'input': {
          'deviceId': deviceId,
          'photos': photos,
          if (batchId != null) 'batchId': batchId,
        },
      },
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create pending sync items query options
  static QueryOptions satpamPendingSyncItemsOptions({
    required String deviceId,
  }) {
    return QueryOptions(
      document: gql(satpamPendingSyncItemsQuery),
      variables: {
        'deviceId': deviceId,
      },
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create satpam sync status subscription options
  static SubscriptionOptions<Map<String, dynamic>> satpamSyncUpdateOptions({
    required String deviceId,
  }) {
    return SubscriptionOptions<Map<String, dynamic>>(
      document: gql(satpamSyncUpdateSubscription),
      variables: {
        'deviceId': deviceId,
      },
      errorPolicy: ErrorPolicy.all,
    );
  }
}
