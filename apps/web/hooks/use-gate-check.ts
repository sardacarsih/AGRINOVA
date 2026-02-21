// Gate Check Hook
// Custom hook for managing gate check state and operations

import { useState, useEffect } from 'react';
import { 
  getActiveVehicles, 
  getGateCheckStats, 
  recordVehicleEntry, 
  recordVehicleExit,
  getRecentEntries,
  getRecentExits,
  searchVehicles,
  updateVehicleStatus,
  getVehicleById,
  getGateCheckHistory
} from '@/lib/services/gate-check-service';
import { Vehicle } from '@/components/dashboard/vehicle-tracker';
import { GateCheckHistory, GateCheckStats as ImportedGateCheckStats, GateCheckEntry } from '@/types/gatecheck';

export type { GateCheckHistory, GateCheckEntry } from '@/types/gatecheck';

export interface GateCheckStats {
  vehiclesInside: number;
  todayEntries: number;
  todayExits: number;
  pendingExit: number;
  averageLoadTime: number;
  complianceRate: number;
}

export function useGateCheck() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<GateCheckStats>({
    vehiclesInside: 0,
    todayEntries: 0,
    todayExits: 0,
    pendingExit: 0,
    averageLoadTime: 0,
    complianceRate: 0
  });
  const [recentEntries, setRecentEntries] = useState<GateCheckHistory[]>([]);
  const [recentExits, setRecentExits] = useState<GateCheckHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active vehicles
  const fetchActiveVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveVehicles();
      setVehicles(data);
    } catch (err) {
      setError('Failed to fetch active vehicles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch gate check stats
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGateCheckStats();
      setStats(data);
    } catch (err) {
      setError('Failed to fetch gate check stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent entries
  const fetchRecentEntries = async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentEntries(limit);
      setRecentEntries(data);
    } catch (err) {
      setError('Failed to fetch recent entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent exits
  const fetchRecentExits = async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentExits(limit);
      setRecentExits(data);
    } catch (err) {
      setError('Failed to fetch recent exits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Record vehicle entry
  const recordEntry = async (entryData: Omit<GateCheckEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await recordVehicleEntry(entryData);
      // Refresh vehicles and stats after recording entry
      await fetchActiveVehicles();
      await fetchStats();
      return data;
    } catch (err) {
      setError('Failed to record vehicle entry');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Record vehicle exit
  const recordExit = async (entryId: string, actualLoad?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await recordVehicleExit(entryId, actualLoad);
      // Refresh vehicles and stats after recording exit
      await fetchActiveVehicles();
      await fetchStats();
      return data;
    } catch (err) {
      setError('Failed to record vehicle exit');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Search vehicles
  const search = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchVehicles(query);
      return data;
    } catch (err) {
      setError('Failed to search vehicles');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update vehicle status
  const updateStatus = async (vehicleId: string, status: Vehicle['status']) => {
    setLoading(true);
    setError(null);
    try {
      const data = await updateVehicleStatus(vehicleId, status);
      // Update the vehicle in the state
      setVehicles(prev => prev.map(v => v.id === vehicleId ? data : v));
      return data;
    } catch (err) {
      setError('Failed to update vehicle status');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get vehicle by ID
  const getVehicle = async (vehicleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVehicleById(vehicleId);
      return data;
    } catch (err) {
      setError('Failed to fetch vehicle');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get gate check history
  const getHistory = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGateCheckHistory(startDate, endDate);
      return data;
    } catch (err) {
      setError('Failed to fetch gate check history');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchActiveVehicles();
    fetchStats();
    fetchRecentEntries();
    fetchRecentExits();
  }, []);

  return {
    // Data
    vehicles,
    stats,
    recentEntries,
    recentExits,
    loading,
    error,
    
    // Functions
    fetchActiveVehicles,
    fetchStats,
    fetchRecentEntries,
    fetchRecentExits,
    recordEntry,
    recordExit,
    search,
    updateStatus,
    getVehicle,
    getHistory
  };
}

// Note: GateCheckEntry interface is now imported from @/types/gatecheck