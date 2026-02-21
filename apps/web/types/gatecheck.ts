import { Vehicle } from '@/components/dashboard/vehicle-tracker';

export interface GateCheckVehicle extends Vehicle {
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

export interface GateCheckHistory {
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
}

export interface GateCheckEntry {
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

export interface GateCheckStats {
  vehiclesInside: number;
  todayEntries: number;
  todayExits: number;
  pendingExit: number;
  averageLoadTime: number;
  complianceRate: number;
}