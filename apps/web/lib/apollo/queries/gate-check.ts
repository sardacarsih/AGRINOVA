import { gql } from 'graphql-tag';

// =============================================================================
// SATPAM TYPES (matching backend satpam.graphqls)
// =============================================================================

// Dashboard Types
export interface SatpamDashboardData {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  posInfo: POSInfo;
  stats: SatpamDashboardStats;
  vehiclesInside: VehicleInsideInfo[];
  vehiclesOutside: VehicleOutsideInfo[];
  vehiclesCompleted: VehicleCompletedInfo[];
  recentActivities: SatpamActivity[];
  syncStatus: SatpamSyncStatus;
  shiftInfo: ShiftInfo;
}

export interface POSInfo {
  posNumber: string;
  posName: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
}

export interface SatpamDashboardStats {
  vehiclesInside: number;
  vehiclesOutside: number;
  todayEntries: number;
  todayExits: number;
  pendingExits: number;
  guestsToday: number;
  qrScansToday: number;
  avgProcessingTime: number;
  overstayCount: number;
  missingExitCount: number;
  missingEntryCount: number;
}

export interface SatpamPhoto {
  id: string;
  photoId: string;
  photoType: string;
  photoUrl: string;
  takenAt: string;
}

export interface VehicleInsideInfo {
  id: string;
  companyId?: string;
  vehiclePlate: string;
  driverName: string;
  vehicleType: VehicleType;
  destination?: string;
  entryTime: string;
  durationMinutes: number;
  isOverstay: boolean;
  qrCode?: string;
  entryGate?: string;
  loadType?: string;
  cargoVolume?: string;
  cargoOwner?: string;
  estimatedWeight?: number;
  deliveryOrderNumber?: string;
  idCardNumber?: string;
  secondCargo?: string;
  photoUrl?: string;
  photos?: SatpamPhoto[];
}

export interface VehicleOutsideInfo {
  id: string;
  companyId?: string;
  vehiclePlate: string;
  driverName: string;
  vehicleType: VehicleType;
  destination?: string;
  exitTime: string;
  exitGate?: string;
  durationMinutes: number;
  loadType?: string;
  cargoVolume?: string;
  cargoOwner?: string;
  estimatedWeight?: number;
  deliveryOrderNumber?: string;
  idCardNumber?: string;
  secondCargo?: string;
  photoUrl?: string;
  photos?: SatpamPhoto[];
}

export interface VehicleCompletedInfo {
  id: string;
  companyId?: string;
  vehiclePlate: string;
  driverName: string;
  vehicleType: VehicleType;
  destination?: string;
  entryTime: string;
  exitTime: string;
  entryGate?: string;
  exitGate?: string;
  durationInsideMinutes: number;
  loadType?: string;
  cargoVolume?: string;
  cargoOwner?: string;
  estimatedWeight?: number;
  deliveryOrderNumber?: string;
  idCardNumber?: string;
  secondCargo?: string;
  photoUrl?: string;
  photos?: SatpamPhoto[];
}

export interface SatpamActivity {
  id: string;
  type: SatpamActivityType;
  title: string;
  description: string;
  gate?: string;
  generationIntent?: GateIntent;
  entityId?: string;
  timestamp: string;
}

export type SatpamActivityType =
  | 'VEHICLE_ENTRY'
  | 'VEHICLE_EXIT'
  | 'GUEST_REGISTERED'
  | 'QR_SCANNED'
  | 'OVERSTAY_ALERT'
  | 'DATA_SYNCED';

export interface SatpamSyncStatus {
  isOnline: boolean;
  lastSyncAt?: string;
  pendingSyncCount: number;
  failedSyncCount: number;
  photosPendingUpload: number;
  lastSyncResult?: string;
  uniqueDeviceCount: number;
}

export interface ShiftInfo {
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  entriesThisShift: number;
  exitsThisShift: number;
}

// Guest Log Types
export interface SatpamGuestLog {
  id: string;
  companyId?: string;
  localId?: string;
  idCardNumber?: string;
  driverName: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  destination?: string;
  gatePosition?: string;
  generationIntent?: GateIntent;
  entryTime?: string;
  exitTime?: string;
  entryGate?: string;
  exitGate?: string;
  photoUrl?: string;
  photos?: SatpamPhoto[];
  qrCodeData?: string;
  createdBy: string;
  createdAt: string;
  syncStatus: SyncStatus;
  deviceId?: string;
  loadType?: string;
  cargoVolume?: string;
  cargoOwner?: string;
  estimatedWeight?: number;
  deliveryOrderNumber?: string;
  secondCargo?: string;
}

export type VehicleType = 'TRUCK' | 'PICKUP' | 'CAR' | 'MOTORCYCLE' | 'OTHER';
export type GuestLogStatus = 'INSIDE' | 'EXITED' | 'EXIT' | 'OVERSTAY' | 'CANCELLED';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'CONFLICT';
export type GateIntent = 'ENTRY' | 'EXIT';
export type QRTokenStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

// QR Token Types
export interface SatpamQRToken {
  id: string;
  token: string;
  jti: string;
  generationIntent: GateIntent;
  allowedScan: GateIntent;
  status: QRTokenStatus;
  expiresAt: string;
  generatedAt: string;
  guestLogId?: string;
}

// History Types
export interface SatpamHistoryFilter {
  status?: GuestLogStatus;
  vehicleType?: VehicleType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'ENTRY_TIME' | 'EXIT_TIME' | 'DURATION' | 'VEHICLE_PLATE' | 'GUEST_NAME';
  sortDirection?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
}

export interface SyncStatusStats {
  totalSynced: number;
  totalPending: number;
  totalFailed: number;
  totalConflict: number;
}

export interface SatpamHistoryResponse {
  items: SatpamGuestLog[];
  totalCount: number;
  hasMore: boolean;
  summary: SatpamHistorySummary;
  syncStats: SyncStatusStats;
}

export interface SatpamHistorySummary {
  totalEntries: number;
  totalExits: number;
  currentlyInside: number;
  avgDuration: number;
  overstayCount: number;
}

// Registration Types
export interface CreateGuestRegistrationInput {
  guestName: string;
  guestCompany?: string;
  guestPurpose: string;
  guestPhone?: string;
  guestEmail?: string;
  idCardNumber?: string;
  driverName: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  destination?: string;
  gatePosition: string;
  notes?: string;
  deviceId: string;
  clientTimestamp: string;
  localId: string;
  photoPath?: string;
  latitude?: number;
  longitude?: number;
}

export interface GuestRegistrationResult {
  success: boolean;
  message: string;
  guestLog?: SatpamGuestLog;
  qrToken?: SatpamQRToken;
  errors?: string[];
}

// Exit Types
export interface ProcessExitInput {
  identifier: string;
  identifierType: 'GUEST_LOG_ID' | 'QR_TOKEN' | 'VEHICLE_PLATE';
  exitGate: string;
  notes?: string;
  deviceId: string;
  clientTimestamp: string;
  photoPath?: string;
}

export interface ProcessExitResult {
  success: boolean;
  message: string;
  guestLog?: SatpamGuestLog;
  duration?: number;
  wasOverstay: boolean;
  errors?: string[];
}

// QR Validation Types
export interface ValidateQRInput {
  qrData: string;
  expectedIntent: GateIntent;
  deviceId: string;
  latitude?: number;
  longitude?: number;
}

export interface QRValidationResult {
  isValid: boolean;
  message: string;
  tokenInfo?: SatpamQRToken;
  guestLog?: SatpamGuestLog;
  allowedOperations: GateIntent[];
  errors?: string[];
}

// Legacy types for backward compatibility
export interface GateCheckRecord {
  id: string;
  satpamId: string;
  nomorPolisi: string;
  nameSupir: string;
  blockId?: string;
  intent: 'ENTRY' | 'EXIT';
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  waktuMasuk?: string;
  waktuKeluar?: string;
  muatan?: string;
  nomorDo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateCheckStats {
  totalToday: number;
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
  entryCount: number;
  exitCount: number;
  averageProcessingTime: number;
}

export interface QRToken {
  id: string;
  token: string;
  intent: 'ENTRY' | 'EXIT';
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

// =============================================================================
// SATPAM QUERIES
// =============================================================================

// Main Dashboard Query - fetches all dashboard data in one request
export const GET_SATPAM_DASHBOARD = gql`
  query GetSatpamDashboard {
    satpamDashboard {
      user {
        id
        username
        name
        role
      }
      posInfo {
        posNumber
        posName
        companyId
        companyName
        isActive
      }
      stats {
        vehiclesInside
        vehiclesOutside
        todayEntries
        todayExits
        pendingExits
        guestsToday
        qrScansToday
        avgProcessingTime
        overstayCount
        missingExitCount
        missingEntryCount
      }
      vehiclesInside {
        id
        vehiclePlate
        driverName
        vehicleType
        destination
        entryTime
        durationMinutes
        isOverstay
        qrCode
        entryGate
        loadType
        cargoVolume
        cargoOwner
        estimatedWeight
        deliveryOrderNumber
        idCardNumber
        secondCargo
        photoUrl
        photos {
          id
          photoId
          photoType
          photoUrl
          takenAt
        }
      }
      vehiclesOutside {
        id
        vehiclePlate
        driverName
        vehicleType
        destination
        exitTime
        exitGate
        durationMinutes
        loadType
        cargoVolume
        cargoOwner
        estimatedWeight
        deliveryOrderNumber
        idCardNumber
        secondCargo
        photoUrl
        photos {
          id
          photoId
          photoType
          photoUrl
          takenAt
        }
      }
      vehiclesCompleted {
        id
        vehiclePlate
        driverName
        vehicleType
        destination
        entryTime
        exitTime
        entryGate
        exitGate
        durationInsideMinutes
        loadType
        cargoVolume
        cargoOwner
        estimatedWeight
        deliveryOrderNumber
        idCardNumber
        secondCargo
        photoUrl
        photos {
          id
          photoId
          photoType
          photoUrl
          takenAt
        }
      }
      recentActivities {
        id
        type
        title
        description
        gate
        generationIntent
        entityId
        timestamp
      }
      syncStatus {
        isOnline
        lastSyncAt
        pendingSyncCount
        failedSyncCount
        photosPendingUpload
        lastSyncResult
        uniqueDeviceCount
      }
      shiftInfo {
        shiftName
        shiftStart
        shiftEnd
        entriesThisShift
        exitsThisShift
      }
    }
  }
`;

// Stats Only Query
export const GET_SATPAM_STATS = gql`
  query GetSatpamDashboardStats {
    satpamDashboardStats {
      vehiclesInside
      vehiclesOutside
      todayEntries
      todayExits
      pendingExits
      guestsToday
      qrScansToday
      avgProcessingTime
      overstayCount
      missingExitCount
      missingEntryCount
    }
  }
`;

// Vehicles Inside Query
export const GET_VEHICLES_INSIDE = gql`
  query GetVehiclesInside($search: String) {
    vehiclesInside(search: $search) {
      id
      companyId
      vehiclePlate
      driverName
      vehicleType
      destination
      entryTime
      durationMinutes
      isOverstay
      idCardNumber
      secondCargo
      photoUrl
      photos {
        id
        photoId
        photoType
        photoUrl
        takenAt
      }
    }
  }
`;

// History Query
export const GET_SATPAM_HISTORY = gql`
  query GetSatpamHistory($filter: SatpamHistoryFilter) {
    satpamHistory(filter: $filter) {
      items {
        id
        companyId
        localId
        idCardNumber
        driverName
        vehiclePlate
        vehicleType
        destination
        gatePosition
        generationIntent
        entryTime
        exitTime
        entryGate
        exitGate
        photoUrl
        photos {
          id
          photoId
          photoType
          photoUrl
          takenAt
        }
        qrCodeData
        createdBy
        createdAt
        syncStatus
        loadType
        cargoVolume
        cargoOwner
        estimatedWeight
        deliveryOrderNumber
        secondCargo
        deviceId
      }
      totalCount
      hasMore
      summary {
        totalEntries
        totalExits
        currentlyInside
        avgDuration
        overstayCount
      }
      syncStats {
        totalSynced
        totalPending
        totalFailed
        totalConflict
      }
    }
  }
`;

// Single Guest Log Query
export const GET_SATPAM_GUEST_LOG = gql`
  query GetSatpamGuestLog($id: ID!) {
    satpamGuestLog(id: $id) {
      id
      localId
      idCardNumber
      driverName
      vehiclePlate
      vehicleType
      destination
      gatePosition
      generationIntent
      entryTime
      exitTime
      entryGate
      exitGate
      loadType
      cargoVolume
      cargoOwner
      estimatedWeight
      deliveryOrderNumber
      secondCargo
      photoUrl
      photos {
        id
        photoId
        photoType
        photoUrl
        takenAt
      }
      qrCodeData
      createdBy
      createdAt
      syncStatus
    }
  }
`;

// Search Guest Query
export const SEARCH_GUEST = gql`
  query SearchGuest($query: String!) {
    searchGuest(query: $query) {
      id
      localId
      idCardNumber
      driverName
      vehiclePlate
      vehicleType
      destination
      gatePosition
      generationIntent
      entryTime
      exitTime
    }
  }
`;

// Sync Status Query
export const GET_SATPAM_SYNC_STATUS = gql`
  query GetSatpamSyncStatus {
    satpamSyncStatus {
      isOnline
      lastSyncAt
      pendingSyncCount
      failedSyncCount
      photosPendingUpload
      lastSyncResult
      uniqueDeviceCount
    }
  }
`;

// =============================================================================
// SATPAM MUTATIONS
// =============================================================================

// Register Guest Mutation
export const REGISTER_GUEST = gql`
  mutation RegisterGuest($input: CreateGuestRegistrationInput!) {
    registerGuest(input: $input) {
      success
      message
      guestLog {
        id
        localId
        idCardNumber
        driverName
        vehiclePlate
        vehicleType
        destination
        gatePosition
        generationIntent
        entryTime
        qrCodeData
        createdAt
        syncStatus
      }
      qrToken {
        id
        token
        jti
        generationIntent
        allowedScan
        status
        expiresAt
        generatedAt
        guestLogId
      }
      errors
    }
  }
`;

// Generate Guest QR Mutation
export const GENERATE_GUEST_QR = gql`
  mutation GenerateGuestQR(
    $guestLogId: String!
    $intent: GateIntent!
    $deviceId: String!
    $expiryMinutes: Int
  ) {
    generateGuestQR(
      guestLogId: $guestLogId
      intent: $intent
      deviceId: $deviceId
      expiryMinutes: $expiryMinutes
    ) {
      id
      token
      jti
      generationIntent
      allowedScan
      status
      expiresAt
      generatedAt
      guestLogId
    }
  }
`;

// Process Guest Exit Mutation
export const PROCESS_GUEST_EXIT = gql`
  mutation ProcessGuestExit($input: ProcessExitInput!) {
    processGuestExit(input: $input) {
      success
      message
      guestLog {
        id
        localId
        driverName
        vehiclePlate
        generationIntent
        entryTime
        exitTime
      }
      wasOverstay
      errors
    }
  }
`;

// Validate QR Mutation
export const VALIDATE_SATPAM_QR = gql`
  mutation ValidateSatpamQR($input: ValidateQRInput!) {
    validateSatpamQR(input: $input) {
      isValid
      message
      tokenInfo {
        id
        token
        jti
        generationIntent
        allowedScan
        status
        expiresAt
        guestLogId
      }
      guestLog {
        id
        driverName
        vehiclePlate
        destination
        generationIntent
        entryTime
      }
      allowedOperations
      errors
    }
  }
`;

// Mark Overstay Mutation
export const MARK_OVERSTAY = gql`
  mutation MarkOverstay($guestLogId: String!, $notes: String) {
    markOverstay(guestLogId: $guestLogId, notes: $notes) {
      id
      localId
      driverName
      vehiclePlate
      generationIntent
      entryTime
      exitTime
    }
  }
`;

// =============================================================================
// SATPAM SUBSCRIPTIONS
// =============================================================================

// Vehicle Entry Subscription
export const SATPAM_VEHICLE_ENTRY = gql`
  subscription SatpamVehicleEntry {
    satpamVehicleEntry {
      id
      localId
      idCardNumber
      driverName
      vehiclePlate
      vehicleType
      destination
      gatePosition
      generationIntent
      entryTime
      createdAt
    }
  }
`;

// Vehicle Exit Subscription
export const SATPAM_VEHICLE_EXIT = gql`
  subscription SatpamVehicleExit {
    satpamVehicleExit {
      id
      localId
      driverName
      vehiclePlate
      generationIntent
      entryTime
      exitTime
    }
  }
`;

// Overstay Alert Subscription
export const SATPAM_OVERSTAY_ALERT = gql`
  subscription SatpamOverstayAlert {
    satpamOverstayAlert {
      id
      vehiclePlate
      driverName
      vehicleType
      entryTime
      durationMinutes
      isOverstay
    }
  }
`;

// =============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// =============================================================================

// Old queries - mapped to new ones
export const GET_GATE_CHECK_RECORDS = GET_SATPAM_HISTORY;
export const GET_GATE_CHECK_RECORD = GET_SATPAM_GUEST_LOG;
export const GET_QR_TOKENS = GET_SATPAM_DASHBOARD; // Placeholder

// Old mutations - mapped to new ones
export const CREATE_GATE_CHECK = REGISTER_GUEST;
export const UPDATE_GATE_CHECK = PROCESS_GUEST_EXIT;
export const GENERATE_QR_TOKEN = GENERATE_GUEST_QR;
export const USE_QR_TOKEN = VALIDATE_SATPAM_QR;

// Old subscriptions - mapped to new ones
export const GATE_CHECK_CREATED = SATPAM_VEHICLE_ENTRY;
export const GATE_CHECK_COMPLETED = SATPAM_VEHICLE_EXIT;
