// Gate Check API Service
// This service handles all gate check related API calls

import { apiClient, ApiResponse } from '@/lib/api';
import { GateCheckVehicle, GateCheckHistory, GateCheckEntry, GateCheckStats } from '@/types/gatecheck';

// Get all active vehicles in the estate
export async function getActiveVehicles(): Promise<GateCheckVehicle[]> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckVehicle[]>>('/gate-check/vehicles/active');
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching active vehicles:', error);
    throw error;
  }
}

// Get gate check statistics
export async function getGateCheckStats(): Promise<GateCheckStats> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckStats>>('/gate-check/stats');
    return response.data?.data || {
      vehiclesInside: 0,
      todayEntries: 0,
      todayExits: 0,
      pendingExit: 0,
      averageLoadTime: 0,
      complianceRate: 0
    };
  } catch (error) {
    console.error('Error fetching gate check stats:', error);
    throw error;
  }
}

// Record a new vehicle entry
export async function recordVehicleEntry(entry: Omit<GateCheckEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<GateCheckEntry> {
  try {
    const response = await apiClient.post<ApiResponse<GateCheckEntry>>('/gate-check/entry', {
      ...entry,
      status: 'ENTERING'
    });
    return response.data?.data || ({} as GateCheckEntry);
  } catch (error) {
    console.error('Error recording vehicle entry:', error);
    throw error;
  }
}

// Record a vehicle exit
export async function recordVehicleExit(entryId: string, actualLoad?: number): Promise<GateCheckEntry> {
  try {
    const response = await apiClient.put<ApiResponse<GateCheckEntry>>(`/gate-check/exit/${entryId}`, {
      actualLoad,
      status: 'EXITING'
    });
    return response.data?.data || ({} as GateCheckEntry);
  } catch (error) {
    console.error('Error recording vehicle exit:', error);
    throw error;
  }
}

// Get recent gate check entries
export async function getRecentEntries(limit: number = 10): Promise<GateCheckHistory[]> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckHistory[]>>(`/gate-check/entries?limit=${limit}`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching recent entries:', error);
    throw error;
  }
}

// Get recent gate check exits
export async function getRecentExits(limit: number = 10): Promise<GateCheckHistory[]> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckHistory[]>>(`/gate-check/exits?limit=${limit}`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching recent exits:', error);
    throw error;
  }
}

// Search vehicles by various criteria
export async function searchVehicles(query: string): Promise<GateCheckVehicle[]> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckVehicle[]>>(`/gate-check/vehicles/search?q=${encodeURIComponent(query)}`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error searching vehicles:', error);
    throw error;
  }
}

// Update vehicle status
export async function updateVehicleStatus(vehicleId: string, status: string): Promise<GateCheckVehicle> {
  try {
    const response = await apiClient.put<ApiResponse<GateCheckVehicle>>(`/gate-check/vehicles/${vehicleId}/status`, { status });
    return response.data?.data || ({} as GateCheckVehicle);
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    throw error;
  }
}

// Get vehicle by ID
export async function getVehicleById(vehicleId: string): Promise<GateCheckVehicle> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckVehicle>>(`/gate-check/vehicles/${vehicleId}`);
    return response.data?.data || ({} as GateCheckVehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    throw error;
  }
}

// Get gate check history for a date range
export async function getGateCheckHistory(startDate: Date, endDate: Date): Promise<GateCheckHistory[]> {
  try {
    const response = await apiClient.get<ApiResponse<GateCheckHistory[]>>(
      `/gate-check/history?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching gate check history:', error);
    throw error;
  }
}