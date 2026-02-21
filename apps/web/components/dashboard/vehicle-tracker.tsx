'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle,
  User,
  Package,
  Timer,
  Navigation,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelativeTime, formatWeight } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface Vehicle {
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
}

export interface VehicleTrackerProps {
  title: string;
  description?: string;
  vehicles: Vehicle[];
  onVehicleAction: (vehicleId: string, action: string) => void;
  className?: string;
}

export function VehicleTracker({
  title,
  description,
  vehicles,
  onVehicleAction,
  className,
}: VehicleTrackerProps) {
  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'ENTERING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INSIDE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'LOADING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'READY_EXIT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'EXITING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Vehicle['status']) => {
    switch (status) {
      case 'ENTERING':
        return Navigation;
      case 'INSIDE':
        return MapPin;
      case 'LOADING':
        return Package;
      case 'READY_EXIT':
        return CheckCircle;
      case 'EXITING':
        return Navigation;
      case 'COMPLETED':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: Vehicle['status']) => {
    switch (status) {
      case 'ENTERING':
        return 'Masuk';
      case 'INSIDE':
        return 'Di Area';
      case 'LOADING':
        return 'Memuat';
      case 'READY_EXIT':
        return 'Siap Keluar';
      case 'EXITING':
        return 'Keluar';
      case 'COMPLETED':
        return 'Selesai';
      default:
        return status;
    }
  };

  const getActionButton = (vehicle: Vehicle) => {
    switch (vehicle.status) {
      case 'ENTERING':
        return (
          <Button 
            size="sm" 
            onClick={() => onVehicleAction(vehicle.id, 'confirm_entry')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Konfirmasi Masuk
          </Button>
        );
      case 'READY_EXIT':
        return (
          <Button 
            size="sm" 
            onClick={() => onVehicleAction(vehicle.id, 'process_exit')}
            className="bg-green-600 hover:bg-green-700"
          >
            Proses Keluar
          </Button>
        );
      case 'EXITING':
        return (
          <Button 
            size="sm" 
            onClick={() => onVehicleAction(vehicle.id, 'confirm_exit')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Konfirmasi Keluar
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onVehicleAction(vehicle.id, 'view_details')}
          >
            Lihat Detail
          </Button>
        );
    }
  };

  const getStatusProgress = (status: Vehicle['status']) => {
    switch (status) {
      case 'ENTERING':
        return 20;
      case 'INSIDE':
        return 40;
      case 'LOADING':
        return 60;
      case 'READY_EXIT':
        return 80;
      case 'EXITING':
        return 90;
      case 'COMPLETED':
        return 100;
      default:
        return 0;
    }
  };

  const getDurationColor = (duration: number) => {
    if (duration > 240) return 'text-red-600'; // > 4 hours
    if (duration > 120) return 'text-yellow-600'; // > 2 hours
    return 'text-green-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <span>{title}</span>
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Masuk/Keluar</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span>Memuat</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Siap</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Tidak ada kendaraan aktif</p>
                <p className="text-sm">Area gate check kosong</p>
              </div>
            ) : (
              vehicles.map((vehicle, index) => {
                const StatusIcon = getStatusIcon(vehicle.status);
                const progress = getStatusProgress(vehicle.status);
                const duration = vehicle.entryTime ? 
                  Math.floor((new Date().getTime() - vehicle.entryTime.getTime()) / (1000 * 60)) : 0;

                return (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      'p-4 border rounded-lg hover:shadow-md transition-all duration-200',
                      vehicle.status === 'READY_EXIT' ? 'border-green-300 bg-green-50' :
                      duration > 240 ? 'border-red-300 bg-red-50' :
                      duration > 120 ? 'border-yellow-300 bg-yellow-50' :
                      'border-gray-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <StatusIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{vehicle.vehicleNumber}</h4>
                            <Badge className={getStatusColor(vehicle.status)}>
                              {getStatusLabel(vehicle.status)}
                            </Badge>
                            {duration > 180 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                OVERTIME
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <User className="h-3 w-3 inline mr-1" />
                            {vehicle.driver}
                          </p>
                          {vehicle.doNumber && (
                            <p className="text-xs text-gray-500">
                              DO: {vehicle.doNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getActionButton(vehicle)}
                        {duration > 0 && (
                          <div className={cn('text-xs font-medium', getDurationColor(duration))}>
                            <Timer className="h-3 w-3 inline mr-1" />
                            {Math.floor(duration / 60)}h {duration % 60}m
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs text-gray-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div 
                          className={cn(
                            'h-2 rounded-full transition-all duration-500',
                            vehicle.status === 'COMPLETED' ? 'bg-green-500' :
                            vehicle.status === 'READY_EXIT' ? 'bg-green-400' :
                            vehicle.status === 'LOADING' ? 'bg-yellow-400' :
                            'bg-blue-400'
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 font-medium">Blok Tujuan</p>
                        <p className="font-semibold">{vehicle.blockAssigned || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Estimasi</p>
                        <p className="font-semibold">{formatWeight(vehicle.estimatedLoad)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Aktual</p>
                        <p className="font-semibold">
                          {vehicle.actualLoad ? formatWeight(vehicle.actualLoad) : 'Pending'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Waktu Masuk</p>
                        <p className="font-semibold">
                          {vehicle.entryTime ? formatDate(vehicle.entryTime, { timeStyle: 'short' }) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Discrepancy Alert */}
                    {vehicle.actualLoad && Math.abs(vehicle.actualLoad - vehicle.estimatedLoad) > 50 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            Discrepancy Detected
                          </span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">
                          Selisih {vehicle.actualLoad > vehicle.estimatedLoad ? '+' : ''}
                          {formatWeight(vehicle.actualLoad - vehicle.estimatedLoad)} dari estimasi
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {vehicle.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">Catatan:</span> {vehicle.notes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Summary */}
        {vehicles.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {vehicles.filter(v => v.status === 'INSIDE' || v.status === 'LOADING').length}
                </p>
                <p className="text-xs text-gray-600">Di Area</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {vehicles.filter(v => v.status === 'LOADING').length}
                </p>
                <p className="text-xs text-gray-600">Memuat</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {vehicles.filter(v => v.status === 'READY_EXIT').length}
                </p>
                <p className="text-xs text-gray-600">Siap Keluar</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {vehicles.filter(v => {
                    const duration = v.entryTime ? 
                      Math.floor((new Date().getTime() - v.entryTime.getTime()) / (1000 * 60)) : 0;
                    return duration > 240;
                  }).length}
                </p>
                <p className="text-xs text-gray-600">Overtime</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VehicleTracker;