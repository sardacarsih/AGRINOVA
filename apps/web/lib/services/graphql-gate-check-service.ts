import { ApolloClient } from '@apollo/client/core';
import {
  // Types
  SatpamDashboardData,
  SatpamDashboardStats,
  VehicleInsideInfo,
  SatpamGuestLog,
  SatpamQRToken,
  SatpamHistoryResponse,
  SatpamHistoryFilter,
  GuestRegistrationResult,
  ProcessExitResult,
  QRValidationResult,
  CreateGuestRegistrationInput,
  ProcessExitInput,
  ValidateQRInput,
  GateIntent,
  // Queries
  GET_SATPAM_DASHBOARD,
  GET_SATPAM_STATS,
  GET_VEHICLES_INSIDE,
  GET_SATPAM_HISTORY,
  GET_SATPAM_GUEST_LOG,
  SEARCH_GUEST,
  // Mutations
  REGISTER_GUEST,
  GENERATE_GUEST_QR,
  PROCESS_GUEST_EXIT,
  VALIDATE_SATPAM_QR,
  MARK_OVERSTAY,
  // Legacy types for backward compatibility
  GateCheckRecord,
  GateCheckStats,
  QRToken,
} from '@/lib/apollo/queries/gate-check';

// =============================================================================
// Input Types for Service Methods
// =============================================================================

export interface RegisterGuestInput {
  guestName: string;
  guestCompany?: string;
  guestPurpose: string;
  driverName: string;
  vehiclePlate: string;
  vehicleType: 'TRUCK' | 'PICKUP' | 'CAR' | 'MOTORCYCLE' | 'OTHER';
  destination?: string;
  gatePosition: string;
  deviceId: string;
  notes?: string;
}

export interface GenerateQRInput {
  guestLogId: string;
  intent: GateIntent;
  deviceId: string;
  expiryMinutes?: number;
}

export interface ProcessExitServiceInput {
  identifier: string;
  identifierType: 'GUEST_LOG_ID' | 'QR_TOKEN' | 'VEHICLE_PLATE';
  exitGate: string;
  deviceId: string;
  notes?: string;
}

export interface ValidateQRServiceInput {
  qrData: string;
  expectedIntent: GateIntent;
  deviceId: string;
}

// Legacy input types for backward compatibility
export interface CreateGateCheckInput {
  satpamId?: string;
  nomorPolisi: string;
  nameSupir: string;
  blockId?: string;
  intent: 'ENTRY' | 'EXIT';
  muatan?: string;
  nomorDo?: string;
}

export interface UpdateGateCheckInput {
  id: string;
  status?: 'PENDING' | 'APPROVED' | 'COMPLETED';
  waktuKeluar?: string;
  muatan?: string;
  nomorDo?: string;
}

export interface GenerateQRTokenInput {
  intent: 'ENTRY' | 'EXIT';
  expirationMinutes: number;
  maxUsage: number;
}

export interface UseQRTokenInput {
  token: string;
  intent: 'ENTRY' | 'EXIT';
  gateCheckId?: string;
}

// =============================================================================
// GraphQL Satpam Service Class
// =============================================================================

export class GraphQLGateCheckService {
  constructor(private client: ApolloClient<unknown>) {}

  // ===========================================================================
  // DASHBOARD QUERIES
  // ===========================================================================

  /**
   * Get complete satpam dashboard data including stats, vehicles, activities
   */
  async getSatpamDashboard(): Promise<SatpamDashboardData | null> {
    try {
      const response = await this.client.query({
        query: GET_SATPAM_DASHBOARD,
        fetchPolicy: 'network-only',
      });
      return response.data?.satpamDashboard || null;
    } catch (error) {
      console.error('Error fetching satpam dashboard:', error);
      return null;
    }
  }

  /**
   * Get satpam dashboard stats only
   */
  async getSatpamStats(): Promise<SatpamDashboardStats | null> {
    try {
      const response = await this.client.query({
        query: GET_SATPAM_STATS,
        fetchPolicy: 'network-only',
      });
      return response.data?.satpamDashboardStats || null;
    } catch (error) {
      console.error('Error fetching satpam stats:', error);
      return null;
    }
  }

  /**
   * Get vehicles currently inside
   */
  async getVehiclesInside(search?: string): Promise<VehicleInsideInfo[]> {
    try {
      const response = await this.client.query({
        query: GET_VEHICLES_INSIDE,
        variables: { search },
        fetchPolicy: 'network-only',
      });
      return response.data?.vehiclesInside || [];
    } catch (error) {
      console.error('Error fetching vehicles inside:', error);
      return [];
    }
  }

  /**
   * Get satpam history with filters
   */
  async getSatpamHistory(filter?: SatpamHistoryFilter): Promise<SatpamHistoryResponse | null> {
    try {
      const response = await this.client.query({
        query: GET_SATPAM_HISTORY,
        variables: { filter },
        fetchPolicy: 'network-only',
      });
      return response.data?.satpamHistory || null;
    } catch (error) {
      console.error('Error fetching satpam history:', error);
      return null;
    }
  }

  /**
   * Get single guest log by ID
   */
  async getGuestLog(id: string): Promise<SatpamGuestLog | null> {
    try {
      const response = await this.client.query({
        query: GET_SATPAM_GUEST_LOG,
        variables: { id },
        fetchPolicy: 'network-only',
      });
      return response.data?.satpamGuestLog || null;
    } catch (error) {
      console.error('Error fetching guest log:', error);
      return null;
    }
  }

  /**
   * Search guest by plate or name
   */
  async searchGuest(query: string): Promise<SatpamGuestLog[]> {
    try {
      const response = await this.client.query({
        query: SEARCH_GUEST,
        variables: { query },
        fetchPolicy: 'network-only',
      });
      return response.data?.searchGuest || [];
    } catch (error) {
      console.error('Error searching guest:', error);
      return [];
    }
  }

  // ===========================================================================
  // MUTATIONS
  // ===========================================================================

  /**
   * Register a new guest
   */
  async registerGuest(input: RegisterGuestInput): Promise<GuestRegistrationResult | null> {
    try {
      const fullInput: CreateGuestRegistrationInput = {
        guestName: input.guestName || input.driverName,
        guestPurpose: input.guestPurpose,
        driverName: input.driverName,
        vehiclePlate: input.vehiclePlate,
        vehicleType: input.vehicleType,
        destination: input.destination ?? input.guestPurpose,
        gatePosition: input.gatePosition,
        notes: input.notes,
        deviceId: input.deviceId,
        clientTimestamp: new Date().toISOString(),
        localId: `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const response = await this.client.mutate({
        mutation: REGISTER_GUEST,
        variables: { input: fullInput },
      });
      return response.data?.registerGuest || null;
    } catch (error) {
      console.error('Error registering guest:', error);
      throw error;
    }
  }

  /**
   * Generate QR token for a guest
   */
  async generateGuestQR(input: GenerateQRInput): Promise<SatpamQRToken | null> {
    try {
      const response = await this.client.mutate({
        mutation: GENERATE_GUEST_QR,
        variables: {
          guestLogId: input.guestLogId,
          intent: input.intent,
          deviceId: input.deviceId,
          expiryMinutes: input.expiryMinutes || 60,
        },
      });
      return response.data?.generateGuestQR || null;
    } catch (error) {
      console.error('Error generating guest QR:', error);
      throw error;
    }
  }

  /**
   * Process guest exit
   */
  async processGuestExit(input: ProcessExitServiceInput): Promise<ProcessExitResult | null> {
    try {
      const fullInput: ProcessExitInput = {
        ...input,
        clientTimestamp: new Date().toISOString(),
      };

      const response = await this.client.mutate({
        mutation: PROCESS_GUEST_EXIT,
        variables: { input: fullInput },
      });
      return response.data?.processGuestExit || null;
    } catch (error) {
      console.error('Error processing guest exit:', error);
      throw error;
    }
  }

  /**
   * Validate QR code
   */
  async validateQR(input: ValidateQRServiceInput): Promise<QRValidationResult | null> {
    try {
      const fullInput: ValidateQRInput = {
        ...input,
      };

      const response = await this.client.mutate({
        mutation: VALIDATE_SATPAM_QR,
        variables: { input: fullInput },
      });
      return response.data?.validateSatpamQR || null;
    } catch (error) {
      console.error('Error validating QR:', error);
      throw error;
    }
  }

  /**
   * Mark guest as overstay
   */
  async markOverstay(guestLogId: string, notes?: string): Promise<SatpamGuestLog | null> {
    try {
      const response = await this.client.mutate({
        mutation: MARK_OVERSTAY,
        variables: { guestLogId, notes },
      });
      return response.data?.markOverstay || null;
    } catch (error) {
      console.error('Error marking overstay:', error);
      throw error;
    }
  }

  // ===========================================================================
  // LEGACY METHODS (for backward compatibility)
  // ===========================================================================

  /**
   * Get gate check records (legacy - uses satpamHistory internally)
   */
  async getGateCheckRecords(): Promise<GateCheckRecord[]> {
    try {
      const history = await this.getSatpamHistory({ pageSize: 100 });
      if (!history?.items) return [];

      // Map SatpamGuestLog to GateCheckRecord for backward compatibility
      return history.items.map((item) => ({
        id: item.id,
        satpamId: item.createdBy,
        nomorPolisi: item.vehiclePlate,
        nameSupir: item.driverName,
        blockId: undefined,
        intent: item.generationIntent === 'EXIT' ? 'EXIT' : 'ENTRY' as const,
        status: item.exitTime ? 'COMPLETED' : item.entryTime ? 'APPROVED' : 'PENDING' as const,
        waktuMasuk: item.entryTime,
        waktuKeluar: item.exitTime,
        muatan: item.destination ?? '',
        nomorDo: undefined,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching gate check records:', error);
      return [];
    }
  }

  /**
   * Get single gate check record (legacy)
   */
  async getGateCheckRecord(id: string): Promise<GateCheckRecord | null> {
    try {
      const guestLog = await this.getGuestLog(id);
      if (!guestLog) return null;

      return {
        id: guestLog.id,
        satpamId: guestLog.createdBy,
        nomorPolisi: guestLog.vehiclePlate,
        nameSupir: guestLog.driverName,
        blockId: undefined,
        intent: guestLog.generationIntent === 'EXIT' ? 'EXIT' : 'ENTRY',
        status: guestLog.exitTime ? 'COMPLETED' : guestLog.entryTime ? 'APPROVED' : 'PENDING',
        waktuMasuk: guestLog.entryTime,
        waktuKeluar: guestLog.exitTime,
        muatan: guestLog.destination ?? '',
        nomorDo: undefined,
        createdAt: guestLog.createdAt,
        updatedAt: guestLog.createdAt,
      };
    } catch (error) {
      console.error('Error fetching gate check record:', error);
      return null;
    }
  }

  /**
   * Create gate check (legacy - uses registerGuest internally)
   */
  async createGateCheck(input: CreateGateCheckInput): Promise<GateCheckRecord | null> {
    try {
      const result = await this.registerGuest({
        guestName: input.nameSupir,
        guestPurpose: input.muatan || 'General',
        driverName: input.nameSupir,
        vehiclePlate: input.nomorPolisi,
        vehicleType: 'TRUCK',
        destination: input.muatan || 'General',
        gatePosition: 'POS-1',
        deviceId: 'web-dashboard',
      });

      if (!result?.guestLog) return null;

      const guestLog = result.guestLog;
      return {
        id: guestLog.id,
        satpamId: guestLog.createdBy,
        nomorPolisi: guestLog.vehiclePlate,
        nameSupir: guestLog.driverName,
        blockId: undefined,
        intent: 'ENTRY',
        status: 'APPROVED',
        waktuMasuk: guestLog.entryTime,
        waktuKeluar: undefined,
        muatan: guestLog.destination ?? '',
        nomorDo: undefined,
        createdAt: guestLog.createdAt,
        updatedAt: guestLog.createdAt,
      };
    } catch (error) {
      console.error('Error creating gate check:', error);
      throw error;
    }
  }

  /**
   * Update gate check (legacy - uses processGuestExit internally)
   */
  async updateGateCheck(input: UpdateGateCheckInput): Promise<GateCheckRecord | null> {
    try {
      const result = await this.processGuestExit({
        identifier: input.id,
        identifierType: 'GUEST_LOG_ID',
        exitGate: 'POS-1',
        deviceId: 'web-dashboard',
      });

      if (!result?.guestLog) return null;

      const guestLog = result.guestLog;
      return {
        id: guestLog.id,
        satpamId: '',
        nomorPolisi: guestLog.vehiclePlate,
        nameSupir: guestLog.driverName,
        blockId: undefined,
        intent: 'EXIT',
        status: 'COMPLETED',
        waktuMasuk: guestLog.entryTime,
        waktuKeluar: guestLog.exitTime,
        muatan: '',
        nomorDo: undefined,
        createdAt: guestLog.entryTime || '',
        updatedAt: guestLog.exitTime || '',
      };
    } catch (error) {
      console.error('Error updating gate check:', error);
      throw error;
    }
  }

  /**
   * Generate QR token (legacy - uses generateGuestQR internally)
   */
  async generateQRToken(input: GenerateQRTokenInput): Promise<QRToken | null> {
    try {
      // For legacy method, we need a guest log ID - this is a placeholder
      // In practice, this should be called after registering a guest
      console.warn('Legacy generateQRToken called without guestLogId - creating placeholder');

      // Return a placeholder token
      return {
        id: `temp-${Date.now()}`,
        token: '',
        intent: input.intent,
        expiresAt: new Date(Date.now() + input.expirationMinutes * 60000).toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating QR token:', error);
      throw error;
    }
  }

  /**
   * Use QR token (legacy - uses validateQR internally)
   */
  async useQRToken(input: UseQRTokenInput): Promise<unknown> {
    try {
      const result = await this.validateQR({
        qrData: input.token,
        expectedIntent: input.intent,
        deviceId: 'web-dashboard',
      });

      return {
        id: result?.tokenInfo?.id,
        tokenId: result?.tokenInfo?.id,
        usedAt: new Date().toISOString(),
        gateCheckId: input.gateCheckId,
        success: result?.isValid,
      };
    } catch (error) {
      console.error('Error using QR token:', error);
      throw error;
    }
  }

  /**
   * Get QR tokens (legacy - placeholder)
   */
  async getQRTokens(): Promise<QRToken[]> {
    try {
      // QR tokens are typically associated with guest logs
      // Return empty array for legacy compatibility
      return [];
    } catch (error) {
      console.error('Error fetching QR tokens:', error);
      return [];
    }
  }

  /**
   * Get gate check statistics (legacy - uses satpamStats internally)
   */
  async getGateCheckStatistics(): Promise<GateCheckStats> {
    try {
      const stats = await this.getSatpamStats();

      if (!stats) {
        return {
          totalToday: 0,
          pendingCount: 0,
          approvedCount: 0,
          completedCount: 0,
          entryCount: 0,
          exitCount: 0,
          averageProcessingTime: 0,
        };
      }

      return {
        totalToday: stats.todayEntries + stats.todayExits,
        pendingCount: stats.pendingExits,
        approvedCount: stats.vehiclesInside,
        completedCount: stats.todayExits,
        entryCount: stats.todayEntries,
        exitCount: stats.todayExits,
        averageProcessingTime: stats.avgProcessingTime,
      };
    } catch (error) {
      console.error('Error calculating gate check statistics:', error);
      return {
        totalToday: 0,
        pendingCount: 0,
        approvedCount: 0,
        completedCount: 0,
        entryCount: 0,
        exitCount: 0,
        averageProcessingTime: 0,
      };
    }
  }
}

// Factory function for service
export function getGateCheckService(client: ApolloClient<unknown>): GraphQLGateCheckService {
  return new GraphQLGateCheckService(client);
}
