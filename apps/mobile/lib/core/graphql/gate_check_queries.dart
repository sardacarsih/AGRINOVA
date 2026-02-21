import 'dart:convert';
import 'package:graphql_flutter/graphql_flutter.dart';

/// GraphQL queries and mutations for gate check operations
class GateCheckQueries {
  /// Generate QR token mutation
  static const String generateQRTokenMutation = r'''
    mutation GenerateQRToken($input: QRTokenGenerationInput!) {
      generateQRToken(input: $input) {
        success
        tokenId
        jwtToken
        qrData {
          token
          generationIntent
          allowedScan
          guestName
          guestCompany
          vehiclePlate
          expiresAt
        }
        metadata {
          crossDevice
          singleUse
          offlineCapable
          validationRequired
        }
      }
    }
  ''';

  /// Validate QR token mutation
  static const String validateQRTokenMutation = r'''
    mutation ValidateQRToken($input: QRTokenValidationInput!) {
      validateQRToken(input: $input) {
        success
        valid
        tokenData {
          vehiclePlate
          vehicleType
          notes
        }
        metadata {
          usedAt
          usedBy
          scannerDevice
          crossDeviceValidation
          singleUseEnforced
        }
      }
    }
  ''';

  /// Upload photo mutation
  static const String uploadPhotoMutation = r'''
    mutation UploadPhoto($input: PhotoUploadInput!) {
      uploadPhoto(input: $input) {
        success
        photoId
        fileName
        originalSize
        compressedSize
        compressionRatio
        uploadedAt
        metadata {
          compressionLevel
          compressionApplied
          photoType
          tokenId
          format
          dimensions {
            width
            height
          }
          processingTime
          checksum
          qualityOptimized
        }
      }
    }
  ''';

  /// Upload batch photos mutation
  static const String uploadBatchPhotosMutation = r'''
    mutation UploadBatchPhotos($input: BatchPhotoUploadInput!) {
      uploadBatchPhotos(input: $input) {
        success
        batch {
          totalPhotos
          successful
          failed
          totalOriginalSize
          totalCompressedSize
          totalCompressionRatio
        }
        results {
          index
          success
          response {
            photoId
            fileName
            originalSize
            compressedSize
            compressionRatio
            uploadedAt
          }
        }
        errors {
          index
          error
          photoType
        }
        metadata {
          batchUpload
          compressionApplied
          tokenId
          processedAt
        }
      }
    }
  ''';

  /// Sync guest log mutation
  static const String syncGuestLogMutation = r'''
    mutation SyncGuestLog($input: GuestLogSyncIndividualInput!) {
      syncGuestLog(input: $input) {
        success
        guestLogId
        syncTransactionId
        syncedPhotos
        serverTimestamp
        metadata {
          conflictResolved
          photosUploaded
          existingRecord
        }
      }
    }
  ''';

  /// Resolve sync conflict mutation
  static const String resolveSyncConflictMutation = r'''
    mutation ResolveSyncConflict($input: ConflictResolutionInput!) {
      resolveSyncConflict(input: $input) {
        success
        conflictId
        resolutionStrategy
        resolvedData
        resolvedAt
      }
    }
  ''';

  /// Sync employee log mutation
  static const String syncEmployeeLogMutation = r'''
    mutation SyncEmployeeLog($input: EmployeeLogSyncInput!) {
      syncEmployeeLog(input: $input) {
        success
        employeeLogId
        syncTransactionId
        message
      }
    }
  ''';

  /// Get QR tokens query
  static const String getQRTokensQuery = r'''
    query GetQRTokens($input: QRTokenQuery) {
      qrTokens(input: $input) {
        id
        jti
        generationIntent
        allowedScan
        currentUsage
        maxUsage
        status
        expiresAt
        generatedAt
        lastUsedAt
        guestLog {
          id
          guestName
          guestCompany
          vehiclePlate
          vehicleType
        }
        createdAt
        updatedAt
      }
    }
  ''';

  /// Get sync transactions query
  static const String getSyncTransactionsQuery = r'''
    query GetSyncTransactions($limit: Int, $offset: Int) {
      syncTransactions(limit: $limit, offset: $offset) {
        id
        operation
        priority
        status
        startedAt
        completedAt
        requestData
        responseData
      }
    }
  ''';

  /// Get sync conflicts query
  static const String getSyncConflictsQuery = r'''
    query GetSyncConflicts($limit: Int, $offset: Int) {
      syncConflicts(limit: $limit, offset: $offset) {
        id
        entityType
        entityId
        conflictType
        serverData
        clientData
        status
        detectedAt
        resolutionStrategy
        resolvedData
        resolvedBy
        resolvedAt
      }
    }
  ''';

  /// Get gate check sync records query
  static const String gateCheckSyncRecordsQuery = r'''
    query GateCheckSyncRecords($input: GateCheckSyncQuery!) {
      gateCheckSyncRecords(input: $input) {
        records {
          id
          guestId
          guestName
          guestCompany
          vehiclePlate
          vehicleType
          destination
          gatePosition
          notes
          qrTokens {
            id
            jti
            status
          }
          photos {
            id
            photoId
            photoType
            filePath
          }
          syncStatus
          createdAt
          updatedAt
        }
        totalCount
        hasMore
        syncMetadata {
          lastSyncAt
          pendingSyncCount
        }
      }
    }
  ''';

  /// Real-time gate check updates subscription
  static const String gateCheckUpdatesSubscription = r'''
    subscription GateCheckUpdates {
      gateCheckUpdates {
        type
        data {
          ... on QRTokenGenerated {
            tokenId
            guestName
            generationIntent
          }
          ... on QRTokenValidated {
            tokenId
            guestName
            scanIntent
            validatedAt
          }
          ... on GuestLogUpdated {
            guestLogId
          }
          ... on PhotoUploaded {
            photoId
            tokenId
            photoType
            uploadedAt
          }
        }
        timestamp
      }
    }
  ''';

  // Helper methods to create query/mutation options

  /// Create generate QR token mutation options
  static MutationOptions generateQRTokenOptions({
    required String generationIntent,
    required String guestName,
    required String guestCompany,
    required String vehiclePlate,
    required String vehicleType,
    required String purpose,
    String? notes,
    String? deviceId,
  }) {
    return MutationOptions(
      document: gql(generateQRTokenMutation),
      variables: {
        'input': {
          'generationIntent': generationIntent,
          'guestName': guestName,
          'guestCompany': guestCompany,
          'vehiclePlate': vehiclePlate,
          'vehicleType': vehicleType,
          'purpose': purpose,
          if (notes != null) 'notes': notes,
          if (deviceId != null) 'deviceId': deviceId,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create validate QR token mutation options
  static MutationOptions validateQRTokenOptions({
    required String qrToken,
    required String scanIntent,
    String? deviceId,
    String? scannerLocation,
  }) {
    return MutationOptions(
      document: gql(validateQRTokenMutation),
      variables: {
        'input': {
          'qrToken': qrToken,
          'scanIntent': scanIntent,
          if (deviceId != null) 'deviceId': deviceId,
          if (scannerLocation != null) 'scannerLocation': scannerLocation,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create upload photo mutation options
  static MutationOptions uploadPhotoOptions({
    required String tokenId,
    required String photoData,
    required String photoType,
    String? fileName,
    int? compressionQuality,
  }) {
    return MutationOptions(
      document: gql(uploadPhotoMutation),
      variables: {
        'input': {
          'tokenId': tokenId,
          'photoData': photoData,
          'photoType': photoType,
          if (fileName != null) 'fileName': fileName,
          if (compressionQuality != null)
            'compressionQuality': compressionQuality,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create upload batch photos mutation options
  static MutationOptions uploadBatchPhotosOptions({
    required String tokenId,
    required List<Map<String, dynamic>> photos,
  }) {
    return MutationOptions(
      document: gql(uploadBatchPhotosMutation),
      variables: {
        'input': {
          'tokenId': tokenId,
          'photos': photos,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create sync guest log mutation options
  static MutationOptions syncGuestLogOptions({
    required String localId,
    required String qrToken,
    required String guestName,
    required String guestCompany,
    required String vehiclePlate,
    required String entryAt,
    String? exitAt,
    List<Map<String, dynamic>>? photos,
    Map<String, dynamic>? metadata,
    required String companyId,
  }) {
    return MutationOptions(
      document: gql(syncGuestLogMutation),
      variables: {
        'input': {
          'localId': localId,
          'qrToken': qrToken,
          'guestName': guestName,
          'guestCompany': guestCompany,
          'vehiclePlate': vehiclePlate,
          'entryAt': entryAt,
          if (exitAt != null) 'exitAt': exitAt,
          if (photos != null) 'photos': photos,
          if (metadata != null) 'metadata': jsonEncode(metadata),
          'companyId': companyId,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create resolve sync conflict mutation options
  static MutationOptions resolveSyncConflictOptions({
    required String conflictId,
    required String resolutionStrategy,
    Map<String, dynamic>? mergedData,
  }) {
    return MutationOptions(
      document: gql(resolveSyncConflictMutation),
      variables: {
        'input': {
          'conflictId': conflictId,
          'resolutionStrategy': resolutionStrategy,
          if (mergedData != null) 'mergedData': mergedData,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create sync employee log mutation options
  static MutationOptions syncEmployeeLogOptions({
    required String deviceId,
    required Map<String, dynamic> record,
    required String clientTimestamp,
  }) {
    return MutationOptions(
      document: gql(syncEmployeeLogMutation),
      variables: {
        'input': {
          'deviceId': deviceId,
          'record': record,
          'clientTimestamp': clientTimestamp,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create get QR tokens query options
  static QueryOptions getQRTokensOptions({
    int? limit,
    String? deviceId,
    String? status,
    String? intent,
    bool includeExpired = false,
  }) {
    return QueryOptions(
      document: gql(getQRTokensQuery),
      variables: {
        'input': {
          if (limit != null) 'limit': limit,
          if (deviceId != null) 'deviceId': deviceId,
          if (status != null) 'status': status,
          if (intent != null) 'intent': intent,
          'includeExpired': includeExpired,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  /// Create get sync transactions query options
  static QueryOptions getSyncTransactionsOptions({int? limit, int? offset}) {
    return QueryOptions(
      document: gql(getSyncTransactionsQuery),
      variables: {
        if (limit != null) 'limit': limit,
        if (offset != null) 'offset': offset,
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  /// Create get sync conflicts query options
  static QueryOptions getSyncConflictsOptions({int? limit, int? offset}) {
    return QueryOptions(
      document: gql(getSyncConflictsQuery),
      variables: {
        if (limit != null) 'limit': limit,
        if (offset != null) 'offset': offset,
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  /// Create gate check sync records query options
  static QueryOptions gateCheckSyncRecordsOptions({
    required String deviceId,
    int limit = 50,
    int offset = 0,
    DateTime? updatedSince,
    bool includePhotos = false,
  }) {
    return QueryOptions(
      document: gql(gateCheckSyncRecordsQuery),
      variables: {
        'input': {
          'deviceId': deviceId,
          'limit': limit,
          'offset': offset,
          if (updatedSince != null)
            'updatedSince': updatedSince.toIso8601String(),
          'includePhotos': includePhotos,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create gate check updates subscription options
  static SubscriptionOptions<Map<String, dynamic>> gateCheckUpdatesOptions() {
    return SubscriptionOptions<Map<String, dynamic>>(
      document: gql(gateCheckUpdatesSubscription),
      errorPolicy: ErrorPolicy.all,
    );
  }

  /// QR token status subscription for cross-device monitoring
  static const String qrTokenStatusSubscription = r'''
    subscription QRTokenStatus($tokenId: String!) {
      qrTokenStatus(tokenId: $tokenId) {
        tokenId
        status
        generationIntent
        allowedScan
        isUsed
        usedAt
        usedBy
        scannerDeviceId
        crossDevice
        validationDetails {
          scanIntent
          scannerLocation
          validatedAt
          validatedBy
        }
        guestData {
          guestName
          guestCompany
          vehiclePlate
        }
      }
    }
  ''';

  /// Vehicle entry subscription (matches backend satpamVehicleEntry)
  static const String guestLogUpdatesSubscription = r'''
    subscription SatpamVehicleEntry {
      satpamVehicleEntry {
        id
        localId
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
        notes
        createdBy
        createdAt
        syncStatus
      }
    }
  ''';

  /// Gate check statistics query
  static const String gateCheckStatisticsQuery = r'''
    query GetGateCheckStatistics(
      $gateId: String
      $fromDate: Time
      $toDate: Time
    ) {
      gateCheckStatistics(
        gateId: $gateId
        fromDate: $fromDate
        toDate: $toDate
      ) {
        gateId
        todayEntries
        todayExits
        vehiclesInside
        pendingExit
        activeQRTokens
        totalQRGenerated
        totalQRUsed
        qrSuccessRate
        averageProcessingTime
        photosSynced
        pendingSync
        conflictsResolved
        lastUpdated
        realTimeStatus
        dailyTrend {
          date
          entries
          exits
          qrGenerated
          qrUsed
        }
        hourlyActivity {
          hour
          entries
          exits
          qrActivity
        }
      }
    }
  ''';

  /// Guest log history query with filtering
  static const String guestLogHistoryQuery = r'''
    query GetGuestLogHistory(
      $filters: GuestLogFilters
      $pagination: PaginationInput
    ) {
      guestLogHistory(
        filters: $filters
        pagination: $pagination
      ) {
        totalCount
        hasNextPage
        guestLogs {
          guestId
          guestName
          guestCompany
          vehiclePlate
          vehicleType
          purpose
          destination
          gatePosition
          qrToken
          photos {
            photoId
            type
            photoUrl
            thumbnailUrl
            timestamp
          }
          notes
          createdBy
          createdAt
          updatedAt
          syncStatus
          serverRecordId
        }
      }
    }
  ''';

  /// Create manual guest log mutation
  static const String createManualGuestLogMutation = r'''
    mutation CreateManualGuestLog(
      $input: ManualGuestLogInput!
    ) {
      createManualGuestLog(input: $input) {
        success
        guestLogId
        message
        guestData {
          guestId
          guestName
          guestCompany
          vehiclePlate
          purpose
          gatePosition
          notes
        }
        uploadedPhotos {
          photoId
          photoType
          photoUrl
          uploadStatus
        }
      }
    }
  ''';

  /// Sync guest logs mutation with conflict resolution
  static const String syncGuestLogsMutation = r'''
    mutation SyncGuestLogs(
      $input: GuestLogSyncInput!
    ) {
      syncGuestLogs(input: $input) {
        success
        processedCount
        syncedCount
        conflictCount
        errorCount
        message
        syncResults {
          guestLogId
          status
          conflictResolution
          serverRecordId
          syncedAt
        }
        conflicts {
          guestLogId
          conflictType
          localData
          serverData
          autoResolvable
          resolutionStrategy
        }
        errors {
          guestLogId
          errorType
          errorMessage
        }
      }
    }
  ''';

  /// Create QR token status subscription options
  static SubscriptionOptions qrTokenStatusOptions({
    required String tokenId,
  }) {
    return SubscriptionOptions(
      document: gql(qrTokenStatusSubscription),
      variables: {
        'tokenId': tokenId,
      },
      errorPolicy: ErrorPolicy.all,
    );
  }

  /// Create guest log updates subscription options
  static SubscriptionOptions<Map<String, dynamic>> guestLogUpdatesOptions() {
    return SubscriptionOptions<Map<String, dynamic>>(
      document: gql(guestLogUpdatesSubscription),
      errorPolicy: ErrorPolicy.all,
    );
  }

  /// Create gate check statistics query options
  static QueryOptions getGateCheckStatisticsOptions({
    String? gateId,
    DateTime? fromDate,
    DateTime? toDate,
  }) {
    return QueryOptions(
      document: gql(gateCheckStatisticsQuery),
      variables: {
        if (gateId != null) 'gateId': gateId,
        if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
        if (toDate != null) 'toDate': toDate.toIso8601String(),
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  /// Create guest log history query options
  static QueryOptions getGuestLogHistoryOptions({
    DateTime? fromDate,
    DateTime? toDate,
    String? vehiclePlate,
    String? guestName,
    String? status,
    int limit = 50,
    int offset = 0,
  }) {
    return QueryOptions(
      document: gql(guestLogHistoryQuery),
      variables: {
        'filters': {
          if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
          if (toDate != null) 'toDate': toDate.toIso8601String(),
          if (vehiclePlate != null) 'vehiclePlate': vehiclePlate,
          if (guestName != null) 'guestName': guestName,
          if (status != null) 'status': status,
        },
        'pagination': {
          'limit': limit,
          'offset': offset,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  /// Create manual guest log mutation options
  static MutationOptions createManualGuestLogOptions({
    required String guestName,
    required String guestCompany,
    required String vehiclePlate,
    required String vehicleType,
    required String purpose,
    required String action,
    String? notes,
    String? destination,
    String? gatePosition,
    List<Map<String, dynamic>>? photos,
  }) {
    return MutationOptions(
      document: gql(createManualGuestLogMutation),
      variables: {
        'input': {
          'guestName': guestName,
          'guestCompany': guestCompany,
          'vehiclePlate': vehiclePlate,
          'vehicleType': vehicleType,
          'purpose': purpose,
          'action': action,
          'notes': notes,
          'destination': destination,
          'gatePosition': gatePosition,
          'photos': photos,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create sync guest logs mutation options
  static MutationOptions syncGuestLogsOptions({
    required List<Map<String, dynamic>> guestLogs,
    bool resolveConflicts = true,
  }) {
    return MutationOptions(
      document: gql(syncGuestLogsMutation),
      variables: {
        'input': {
          'guestLogs': guestLogs,
          'resolveConflicts': resolveConflicts,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }
}
