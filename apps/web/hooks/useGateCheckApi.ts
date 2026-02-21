// Gate Check Hook for API Integration
// Custom hook for managing gate check state and operations with real API

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

// Define interfaces locally to avoid circular dependencies
interface GateCheckVehicle {
  id: string;
  vehicleNumber: string;
  driver: string;
  status: 'ENTERING' | 'INSIDE' | 'LOADING' | 'READY_EXIT' | 'EXITING' | 'COMPLETED';
  entryTime?: Date;
  exitTime?: Date;
  estimatedLoad: number;
  actualLoad?: number;
  blockAssigned?: string;
  doNumber?: string;
  notes?: string;
  location?: string;
  duration?: number; // in minutes
  posNumber: string; // Pos No
  date: Date; // Tanggal
  time: string; // Jam
  passed: boolean; // Lewat
  driverName: string; // Nama Driver
  vehiclePlate: string; // Plat Kendaraan
  vehicleType: string; // Jenis Kendaraan
  vehicleCharacteristics: string; // Ciri Khas
  destinationLocation: string; // Lokasi Tujuan
  loadType: string; // Jenis Muatan
  loadVolume: number; // Volume Muatan
  loadOwner: string; // Pemilik Muatan
}

interface GateCheckHistory {
  id: string;
  posNumber: string; // Pos No
  date: Date; // Tanggal
  time: string; // Jam
  passed: boolean; // Lewat
  driverName: string; // Nama Driver
  vehiclePlate: string; // Plat Kendaraan
  vehicleType: string; // Jenis Kendaraan
  vehicleCharacteristics: string; // Ciri Khas
  destinationLocation: string; // Lokasi Tujuan
  loadType: string; // Jenis Muatan
  loadVolume: number; // Volume Muatan
  loadOwner: string; // Pemilik Muatan
  notes: string; // Keterangan
  entryTime: Date;
  exitTime?: Date;
  status: string;
  discrepancy?: number;
  createdAt: Date;
  // Extended properties for backward compatibility
  vehicleNumber?: string;
  doNumber?: string;
  blockAssigned?: string;
  estimatedLoad?: number;
  actualLoad?: number;
}

interface GateCheckEntry {
  id: string;
  posNumber: string; // Pos No
  date: Date; // Tanggal
  time: string; // Jam
  passed: boolean; // Lewat
  driverName: string; // Nama Driver
  vehiclePlate: string; // Plat Kendaraan
  vehicleType: string; // Jenis Kendaraan
  vehicleCharacteristics: string; // Ciri Khas
  destinationLocation: string; // Lokasi Tujuan
  loadType: string; // Jenis Muatan
  loadVolume: number; // Volume Muatan
  loadOwner: string; // Pemilik Muatan
  notes: string; // Keterangan
  entryTime: Date;
  exitTime?: Date;
  status: 'ENTERING' | 'INSIDE' | 'LOADING' | 'READY_EXIT' | 'EXITING' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

interface GateCheckStats {
  vehiclesInside: number;
  todayEntries: number;
  todayExits: number;
  pendingExit: number;
  averageLoadTime: number;
  complianceRate: number;
}

export function useGateCheckApi() {
  const [vehicles, setVehicles] = useState<GateCheckVehicle[]>([]);
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
      setVehicles(data as unknown as GateCheckVehicle[]);
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
      setStats(data as GateCheckStats);
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
      setRecentEntries(data as unknown as GateCheckHistory[]);
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
      setRecentExits(data as unknown as GateCheckHistory[]);
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
      const data = await recordVehicleEntry(entryData as any);
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
  const updateStatus = async (vehicleId: string, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await updateVehicleStatus(vehicleId, status);
      // Update the vehicle in the state
      setVehicles(prev => prev.map(v => v.id === vehicleId ? {...v, status} as GateCheckVehicle : v));
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