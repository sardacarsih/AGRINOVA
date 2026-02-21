'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { motion } from 'framer-motion';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { SatpamDashboardLayout } from '@/components/layouts/role-layouts/SatpamDashboardLayout';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  QrCode,
  Truck,
  Shield,
  Activity,
  Eye,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Clock,
  Calendar,
  Car,
  Bike,
  MapPin,
  Package,
  Timer,
  Users,
  TrendingUp,
  TrendingDown,
  CircleDot,
  FileText,
  User,
  CreditCard,
} from 'lucide-react';
import { getGateCheckService } from '@/lib/services/graphql-gate-check-service';
import {
  SatpamDashboardData,
  SatpamDashboardStats,
  VehicleInsideInfo,
  VehicleOutsideInfo,
  VehicleCompletedInfo,
  SatpamActivity,
  SatpamSyncStatus,
  ShiftInfo,
} from '@/lib/apollo/queries/gate-check';
import { resolveMediaUrl } from '@/lib/utils/media-url';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Baru saja';
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;

  return `${Math.floor(diffInHours / 24)} hari lalu`;
};

const safeParseDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;

  // Handle Postgres style "YYYY-MM-DD HH:mm:ss.SSS+ZZ" or similar
  let formatted = dateString.toString();

  // If it contains space and no T, replace first space with T.
  // Exception: If it's already ISO format or simple date string without time
  if (formatted.includes(' ') && !formatted.includes('T')) {
    formatted = formatted.replace(' ', 'T');
  }

  // If timezone is +XX or -XX at end without :00, append :00
  if (/[+-]\d{2}$/.test(formatted)) {
    formatted += ':00';
  }

  const date = new Date(formatted);
  return isNaN(date.getTime()) ? null : date;
};

const toDateBoundary = (dateValue: string, boundary: 'start' | 'end'): Date | null => {
  if (!dateValue) return null;
  const timePart = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  const parsed = new Date(`${dateValue}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthToTodayRange = (): { from: string; to: string } => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: formatDateForInput(firstDay),
    to: formatDateForInput(now),
  };
};

const isDateWithinRange = (
  dateValue: string | Date | null | undefined,
  range: { from: Date | null; to: Date | null }
): boolean => {
  if (!range.from && !range.to) return true;
  const parsed = safeParseDate(dateValue);
  if (!parsed) return false;
  if (range.from && parsed < range.from) return false;
  if (range.to && parsed > range.to) return false;
  return true;
};

const formatDuration = (minutes: number) => {
  // Handle negative or zero duration
  if (minutes < 0) return 'Baru masuk';
  if (minutes === 0) return '< 1 menit';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} menit`;
  } else if (mins === 0) {
    return `${hours} jam`;
  } else {
    return `${hours} jam ${mins} menit`;
  }
};

const getVehicleIcon = (type: string) => {
  switch (type) {
    case 'TRUCK': return Truck;
    case 'PICKUP': return Truck;
    case 'CAR': return Car;
    case 'MOTORCYCLE': return Bike;
    default: return Truck;
  }
};

const getVehicleTypeName = (type: string) => {
  switch (type) {
    case 'TRUCK': return 'Truk';
    case 'PICKUP': return 'Pickup';
    case 'CAR': return 'Mobil';
    case 'MOTORCYCLE': return 'Motor';
    default: return type;
  }
};

const getVehiclePhotoUrl = (url: string | undefined) => {
  return resolveMediaUrl(url);
};

// =============================================================================
// METRIC CARDS
// =============================================================================

const colorConfig = {
  blue: {
    gradient: 'from-blue-500/10 to-blue-600/5',
    gradientDark: 'dark:from-blue-500/20 dark:to-blue-600/10',
    accentBar: 'bg-blue-500',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-blue-700 dark:text-blue-300',
    hoverBorder: 'hover:border-blue-200/60 dark:hover:border-blue-500/30',
    hoverShadow: 'hover:shadow-blue-500/10',
    ringColor: 'ring-blue-500/20',
    dotColor: 'bg-blue-400',
    dotSolid: 'bg-blue-500',
    severity: 'normal' as const,
  },
  green: {
    gradient: 'from-emerald-500/10 to-green-600/5',
    gradientDark: 'dark:from-emerald-500/20 dark:to-green-600/10',
    accentBar: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-700 dark:text-emerald-300',
    hoverBorder: 'hover:border-emerald-200/60 dark:hover:border-emerald-500/30',
    hoverShadow: 'hover:shadow-emerald-500/10',
    ringColor: 'ring-emerald-500/20',
    dotColor: 'bg-emerald-400',
    dotSolid: 'bg-emerald-500',
    severity: 'normal' as const,
  },
  purple: {
    gradient: 'from-violet-500/10 to-purple-600/5',
    gradientDark: 'dark:from-violet-500/20 dark:to-purple-600/10',
    accentBar: 'bg-violet-500',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    valueColor: 'text-violet-700 dark:text-violet-300',
    hoverBorder: 'hover:border-violet-200/60 dark:hover:border-violet-500/30',
    hoverShadow: 'hover:shadow-violet-500/10',
    ringColor: 'ring-violet-500/20',
    dotColor: 'bg-violet-400',
    dotSolid: 'bg-violet-500',
    severity: 'normal' as const,
  },
  orange: {
    gradient: 'from-amber-500/10 to-orange-600/5',
    gradientDark: 'dark:from-amber-500/20 dark:to-orange-600/10',
    accentBar: 'bg-amber-500',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-700 dark:text-amber-300',
    hoverBorder: 'hover:border-amber-200/60 dark:hover:border-amber-500/30',
    hoverShadow: 'hover:shadow-amber-500/10',
    ringColor: 'ring-amber-500/20',
    dotColor: 'bg-amber-400',
    dotSolid: 'bg-amber-500',
    severity: 'warning' as const,
  },
  red: {
    gradient: 'from-red-500/10 to-rose-600/5',
    gradientDark: 'dark:from-red-500/20 dark:to-rose-600/10',
    accentBar: 'bg-red-500',
    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    valueColor: 'text-red-700 dark:text-red-300',
    hoverBorder: 'hover:border-red-200/60 dark:hover:border-red-500/30',
    hoverShadow: 'hover:shadow-red-500/10',
    ringColor: 'ring-red-500/20',
    dotColor: 'bg-red-400',
    dotSolid: 'bg-red-500',
    severity: 'alert' as const,
  },
  teal: {
    gradient: 'from-teal-500/10 to-teal-600/5',
    gradientDark: 'dark:from-teal-500/20 dark:to-teal-600/10',
    accentBar: 'bg-teal-500',
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    valueColor: 'text-teal-700 dark:text-teal-300',
    hoverBorder: 'hover:border-teal-200/60 dark:hover:border-teal-500/30',
    hoverShadow: 'hover:shadow-teal-500/10',
    ringColor: 'ring-teal-500/20',
    dotColor: 'bg-teal-400',
    dotSolid: 'bg-teal-500',
    severity: 'normal' as const,
  },
};

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'teal';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  index?: number;
}

function MetricCard({ title, value, description, icon: Icon, color, trend, trendValue, loading, index = 0 }: MetricCardProps) {
  const config = colorConfig[color];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const isAlert = config.severity === 'alert' || config.severity === 'warning';
  const hasNonZeroAlert = isAlert && value > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border bg-gradient-to-br bg-card/80 backdrop-blur-sm',
          'transition-all duration-300 ease-out',
          config.gradient,
          config.gradientDark,
          config.hoverBorder,
          'hover:shadow-lg',
          config.hoverShadow,
          hasNonZeroAlert && `ring-1 ${config.ringColor}`,
          'dark:bg-card/60 dark:border-border/40'
        )}
      >
        {/* Top accent bar */}
        <div className={cn('absolute top-0 left-0 right-0 h-0.5', config.accentBar)} />

        {/* Pulsing alert dot for non-zero warning/critical values */}
        {hasNonZeroAlert && (
          <div className="absolute top-3 right-3 z-10">
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.dotColor
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                config.dotSolid
              )} />
            </span>
          </div>
        )}


        <div className="relative p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 bg-muted rounded-md w-2/3 animate-pulse" />
                <div className="h-9 w-9 bg-muted rounded-xl animate-pulse" />
              </div>
              <div className="h-9 bg-muted rounded-md w-1/2 animate-pulse" />
              <div className="h-3 bg-muted rounded-md w-4/5 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top row: Title + Icon */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                <div className={cn(
                  'rounded-xl p-2.5 transition-colors duration-200',
                  config.iconBg
                )}>
                  <Icon className={cn('h-5 w-5', config.iconColor)} />
                </div>
              </div>

              {/* Value + Trend */}
              <div className="flex items-end gap-2">
                <motion.span
                  key={value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-3xl font-extrabold tracking-tight leading-none',
                    hasNonZeroAlert ? config.valueColor : 'text-foreground'
                  )}
                >
                  {value.toLocaleString('id-ID')}
                </motion.span>

                {TrendIcon && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full mb-1',
                      trend === 'up'
                        ? 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-500/20'
                        : 'text-red-700 bg-red-100/80 dark:text-red-400 dark:bg-red-500/20'
                    )}
                  >
                    <TrendIcon className="h-3 w-3" />
                    <span>{trendValue || (trend === 'up' ? '+2.5%' : '-1.2%')}</span>
                  </motion.div>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// VEHICLES INSIDE TABLE
// =============================================================================

interface VehiclesTableProps {
  vehicles: VehicleInsideInfo[];
  loading: boolean;
}

function VehiclesTable({ vehicles, loading }: VehiclesTableProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-red-500" />
            Kendaraan di Dalam Estate (Periode Terpilih)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-red-500" />
            Kendaraan di Dalam Estate (Periode Terpilih)
          </CardTitle>
          <Badge variant="secondary" className="bg-red-50 text-red-700 font-semibold">
            {vehicles.length} Kendaraan
          </Badge>
        </div>
        <CardDescription>
          Kendaraan yang masuk pada periode terpilih dan masih berada di area perkebunan
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicles.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {vehicles.map((vehicle, index) => {
              const VehicleIcon = getVehicleIcon(vehicle.vehicleType);

              // Calculate duration on client side for consistency
              const now = new Date();
              // Strict entryTime usage - do not fallback to now if missing, handle it in display
              const entryTime = safeParseDate(vehicle.entryTime);

              // If no entryTime, duration is 0
              const durationMs = entryTime ? Math.max(0, now.getTime() - entryTime.getTime()) : 0;
              const clientDurationMinutes = Math.floor(durationMs / (1000 * 60));

              const durationPercent = Math.min((clientDurationMinutes / 480) * 100, 100);

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md ${vehicle.isOverstay
                    ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50'
                    : 'border-slate-100 bg-slate-50 hover:bg-white'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Vehicle Icon / Photo */}
                    <div className="relative group">
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer shadow-sm group">
                              <img
                                src={getVehiclePhotoUrl(vehicle.photos[0].photoUrl || vehicle.photoUrl)}
                                alt={`Foto ${vehicle.vehiclePlate}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.onerror = null;
                                  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Foto Kendaraan: {vehicle.vehiclePlate}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {vehicle.photos.map((photo, i) => (
                                  <div key={photo.id || i} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="bg-white/50 backdrop-blur-sm">
                                        {photo.photoType === 'FRONT' ? 'TAMPAK DEPAN' :
                                          photo.photoType === 'BACK' ? 'TAMPAK BELAKANG' :
                                            photo.photoType}
                                      </Badge>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {photo.photoId}
                                      </span>
                                    </div>
                                    <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img
                                        src={getVehiclePhotoUrl(photo.photoUrl)}
                                        alt={`Foto ${vehicle.vehiclePlate} - ${photo.photoType}`}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                          const el = e.target as HTMLImageElement;
                                          el.onerror = null;
                                          el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full bg-slate-50 p-4 rounded-lg">
                                <div><span className="text-slate-500">Driver:</span> <span className="font-medium text-slate-900">{vehicle.driverName}</span></div>
                                <div><span className="text-slate-500">Plat:</span> <span className="font-medium text-slate-900">{vehicle.vehiclePlate}</span></div>
                                <div><span className="text-slate-500">Masuk:</span> <span className="font-medium text-slate-900">{entryTime?.toLocaleString('id-ID')}</span></div>
                                {vehicle.entryGate && <div><span className="text-slate-500">Gate:</span> <span className="font-medium text-slate-900">{vehicle.entryGate}</span></div>}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className={`rounded-xl p-3 ${vehicle.isOverstay ? 'bg-orange-100' : 'bg-blue-100'}`}>
                          <VehicleIcon className={`h-5 w-5 ${vehicle.isOverstay ? 'text-orange-600' : 'text-blue-600'}`} />
                        </div>
                      )}
                    </div>

                    {/* Vehicle Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{vehicle.vehiclePlate}</p>
                          <p className="text-sm text-slate-600">{vehicle.driverName}</p>
                        </div>
                        {vehicle.isOverstay && (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overstay
                          </Badge>
                        )}
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {getVehicleTypeName(vehicle.vehicleType)}
                        </span>
                        {vehicle.destination && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {vehicle.destination}
                          </span>
                        )}
                        {entryTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Masuk: {entryTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false })}
                            {vehicle.entryGate && (
                              <span className="ml-1 text-slate-400 inline-flex items-center gap-1">
                                • <MapPin className="h-2.5 w-2.5" /> Gate: {vehicle.entryGate}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Cargo & Additional Details */}
                      {(vehicle.loadType || vehicle.cargoVolume || vehicle.cargoOwner || vehicle.deliveryOrderNumber || vehicle.idCardNumber || vehicle.estimatedWeight) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                          {vehicle.loadType && (
                            <div className="flex items-start gap-2">
                              <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Muatan:</span>
                                <span>{vehicle.loadType}</span>
                              </div>
                            </div>
                          )}
                          {(vehicle.cargoVolume || vehicle.estimatedWeight) && (
                            <div className="flex items-start gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Volume/Berat:</span>
                                <span>
                                  {[
                                    vehicle.cargoVolume,
                                    vehicle.estimatedWeight ? `${vehicle.estimatedWeight} kg` : null
                                  ].filter(Boolean).join(' / ')}
                                </span>
                              </div>
                            </div>
                          )}
                          {vehicle.deliveryOrderNumber && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">No. DO:</span>
                                <span className="font-mono bg-slate-100 px-1 rounded">{vehicle.deliveryOrderNumber}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.cargoOwner && (
                            <div className="flex items-start gap-2">
                              <User className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Pemilik:</span>
                                <span>{vehicle.cargoOwner}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.idCardNumber && (
                            <div className="flex items-start gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">No. KTP/SIM:</span>
                                <span className="font-mono">{vehicle.idCardNumber}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.secondCargo && (
                            <div className="flex items-start gap-2">
                              <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Muatan Sekunder:</span>
                                <span>{vehicle.secondCargo}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Duration Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Durasi</span>
                          <span className={`font-medium ${vehicle.isOverstay ? 'text-orange-600' : 'text-slate-700'
                            }`}>
                            {formatDuration(clientDurationMinutes)}
                          </span>
                        </div>
                        <Progress
                          value={durationPercent}
                          className={`h-1.5 ${vehicle.isOverstay ? '[&>div]:bg-orange-500' : '[&>div]:bg-blue-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Tidak ada kendaraan di dalam</p>
            <p className="text-sm">Semua kendaraan telah keluar dari area</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// VEHICLES COMPLETED (SELECTED DATE RANGE)
// =============================================================================

interface VehiclesCompletedTableProps {
  vehicles: VehicleCompletedInfo[];
  loading: boolean;
}

function VehiclesCompletedTable({ vehicles, loading }: VehiclesCompletedTableProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Kendaraan Selesai (Periode Terpilih)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Kendaraan Selesai (Periode Terpilih)
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold">
            {vehicles.length} Kendaraan
          </Badge>
        </div>
        <CardDescription>
          Kendaraan yang masuk dan keluar pada hari yang sama dalam periode terpilih
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicles.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {vehicles.map((vehicle, index) => {
              const VehicleIcon = getVehicleIcon(vehicle.vehicleType);
              const entryTime = safeParseDate(vehicle.entryTime);
              const exitTime = safeParseDate(vehicle.exitTime);

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-white transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Vehicle Icon / Photo */}
                    <div className="relative group">
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer shadow-sm group">
                              <img
                                src={getVehiclePhotoUrl(vehicle.photos[0].photoUrl || vehicle.photoUrl)}
                                alt={`Foto ${vehicle.vehiclePlate}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.onerror = null;
                                  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Foto Kendaraan: {vehicle.vehiclePlate}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {vehicle.photos.map((photo, i) => (
                                  <div key={photo.id || i} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="bg-white/50 backdrop-blur-sm">
                                        {photo.photoType === 'FRONT' ? 'TAMPAK DEPAN' :
                                          photo.photoType === 'BACK' ? 'TAMPAK BELAKANG' :
                                            photo.photoType}
                                      </Badge>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {photo.photoId}
                                      </span>
                                    </div>
                                    <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img
                                        src={getVehiclePhotoUrl(photo.photoUrl)}
                                        alt={`Foto ${vehicle.vehiclePlate} - ${photo.photoType}`}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                          const el = e.target as HTMLImageElement;
                                          el.onerror = null;
                                          el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full bg-slate-50 p-4 rounded-lg">
                                <div><span className="text-slate-500">Driver:</span> <span className="font-medium text-slate-900">{vehicle.driverName}</span></div>
                                <div><span className="text-slate-500">Plat:</span> <span className="font-medium text-slate-900">{vehicle.vehiclePlate}</span></div>
                                <div><span className="text-slate-500">Masuk:</span> <span className="font-medium text-slate-900">{entryTime?.toLocaleString('id-ID')}</span></div>
                                <div><span className="text-slate-500">Keluar:</span> <span className="font-medium text-slate-900">{exitTime?.toLocaleString('id-ID')}</span></div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="rounded-xl p-3 bg-emerald-100">
                          <VehicleIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{vehicle.vehiclePlate}</p>
                          <p className="text-sm text-slate-600">{vehicle.driverName}</p>
                        </div>
                        <Badge className="bg-emerald-500 text-white shrink-0">
                          Selesai
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <LogIn className="h-3 w-3" />
                          {vehicle.entryGate && (
                            <>
                              <span className="font-semibold uppercase tracking-tight text-slate-600 mr-1">{vehicle.entryGate}</span>
                              <span className="text-slate-300 mr-1">|</span>
                            </>
                          )}
                          Masuk: {entryTime?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut className="h-3 w-3" />
                          {vehicle.exitGate && (
                            <>
                              <span className="font-semibold uppercase tracking-tight text-slate-600 mr-1">{vehicle.exitGate}</span>
                              <span className="text-slate-300 mr-1">|</span>
                            </>
                          )}
                          Keluar: {exitTime?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-emerald-600">
                          <Timer className="h-3 w-3" />
                          Durasi: {formatDuration(vehicle.durationInsideMinutes)}
                        </span>
                      </div>

                      {/* Detailed Entry Information */}
                      <div className="mt-3 pt-2 border-t border-emerald-100/50 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        {vehicle.loadType && (
                          <div>
                            <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Muatan</span>
                            <span className="font-medium text-slate-700">{vehicle.loadType}</span>
                          </div>
                        )}
                        {(vehicle.cargoVolume || vehicle.estimatedWeight) && (
                          <div>
                            <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Volume/Berat</span>
                            <span className="font-medium text-slate-700">
                              {[
                                vehicle.cargoVolume,
                                vehicle.estimatedWeight ? `${vehicle.estimatedWeight} kg` : null
                              ].filter(Boolean).join(' / ')}
                            </span>
                          </div>
                        )}
                        {vehicle.deliveryOrderNumber && (
                          <div>
                            <span className="block text-slate-400 uppercase tracking-wider text-[9px]">No. DO</span>
                            <span className="font-mono text-slate-700 bg-slate-50 px-1 rounded">{vehicle.deliveryOrderNumber}</span>
                          </div>
                        )}
                        {vehicle.cargoOwner && (
                          <div>
                            <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Pemilik</span>
                            <span className="font-medium text-slate-700">{vehicle.cargoOwner}</span>
                          </div>
                        )}
                        <div className="col-span-2 border-t border-slate-100 pt-1 mt-1">
                          <span className="block text-slate-400 uppercase tracking-wider text-[9px]">Muatan Sekunder</span>
                          <span className="font-medium text-slate-700">{vehicle.secondCargo || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Belum ada kendaraan yang menyelesaikan proses pada periode terpilih</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// VEHICLES OUTSIDE ESTATE
// =============================================================================

interface VehiclesOutsideTableProps {
  vehicles: VehicleOutsideInfo[];
  loading: boolean;
}

function VehiclesOutsideTable({ vehicles, loading }: VehiclesOutsideTableProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-500" />
            Kendaraan di Luar Estate (Periode Terpilih)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-500" />
            Kendaraan di Luar Estate (Periode Terpilih)
          </CardTitle>
          <Badge variant="secondary" className="bg-teal-50 text-teal-700 font-semibold">
            {vehicles.length} Kendaraan
          </Badge>
        </div>
        <CardDescription>
          Kendaraan yang sudah keluar dari area perkebunan dalam periode terpilih
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicles.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {vehicles.map((vehicle, index) => {
              const VehicleIcon = getVehicleIcon(vehicle.vehicleType);

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Vehicle Icon */}
                    {/* Vehicle Icon / Photo */}
                    <div className="relative group">
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer shadow-sm group">
                              <img
                                src={getVehiclePhotoUrl(vehicle.photos[0].photoUrl || vehicle.photoUrl)}
                                alt={`Foto ${vehicle.vehiclePlate}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.onerror = null;
                                  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Foto Kendaraan: {vehicle.vehiclePlate}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {vehicle.photos.map((photo, i) => (
                                  <div key={photo.id || i} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="bg-white/50 backdrop-blur-sm">
                                        {photo.photoType === 'FRONT' ? 'TAMPAK DEPAN' :
                                          photo.photoType === 'BACK' ? 'TAMPAK BELAKANG' :
                                            photo.photoType}
                                      </Badge>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {photo.photoId}
                                      </span>
                                    </div>
                                    <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img
                                        src={getVehiclePhotoUrl(photo.photoUrl)}
                                        alt={`Foto ${vehicle.vehiclePlate} - ${photo.photoType}`}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                          const el = e.target as HTMLImageElement;
                                          el.onerror = null;
                                          el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full bg-slate-50 p-4 rounded-lg">
                                <div><span className="text-slate-500">Driver:</span> <span className="font-medium text-slate-900">{vehicle.driverName}</span></div>
                                <div><span className="text-slate-500">Plat:</span> <span className="font-medium text-slate-900">{vehicle.vehiclePlate}</span></div>
                                <div><span className="text-slate-500">Keluar:</span> <span className="font-medium text-slate-900">{new Date(vehicle.exitTime).toLocaleString('id-ID')}</span></div>
                                {vehicle.exitGate && <div><span className="text-slate-500">Gate:</span> <span className="font-medium text-slate-900">{vehicle.exitGate}</span></div>}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="rounded-xl p-3 bg-teal-100">
                          <VehicleIcon className="h-5 w-5 text-teal-600" />
                        </div>
                      )}
                    </div>

                    {/* Vehicle Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{vehicle.vehiclePlate}</p>
                          <p className="text-sm text-slate-600">{vehicle.driverName}</p>
                        </div>
                        <Badge className="bg-teal-500 hover:bg-teal-600 text-white shrink-0">
                          <LogOut className="h-3 w-3 mr-1" />
                          Keluar
                        </Badge>
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {getVehicleTypeName(vehicle.vehicleType)}
                        </span>
                        {vehicle.destination && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {vehicle.destination}
                          </span>
                        )}
                        {vehicle.exitTime && (
                          <span className="flex items-center gap-1">
                            <LogOut className="h-3 w-3" />
                            Keluar: {(safeParseDate(vehicle.exitTime) || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false })}
                          </span>
                        )}
                        {vehicle.exitGate && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Gate: {vehicle.exitGate}
                          </span>
                        )}
                      </div>

                      {/* Cargo & Additional Details */}
                      {(vehicle.loadType || vehicle.cargoVolume || vehicle.cargoOwner || vehicle.deliveryOrderNumber || vehicle.idCardNumber || vehicle.estimatedWeight) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                          {vehicle.loadType && (
                            <div className="flex items-start gap-2">
                              <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Muatan:</span>
                                <span>{vehicle.loadType}</span>
                              </div>
                            </div>
                          )}
                          {(vehicle.cargoVolume || vehicle.estimatedWeight) && (
                            <div className="flex items-start gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Volume/Berat:</span>
                                <span>
                                  {[
                                    vehicle.cargoVolume,
                                    vehicle.estimatedWeight ? `${vehicle.estimatedWeight} kg` : null
                                  ].filter(Boolean).join(' / ')}
                                </span>
                              </div>
                            </div>
                          )}
                          {vehicle.deliveryOrderNumber && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">No. DO:</span>
                                <span className="font-mono bg-slate-100 px-1 rounded">{vehicle.deliveryOrderNumber}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.cargoOwner && (
                            <div className="flex items-start gap-2">
                              <User className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Pemilik:</span>
                                <span>{vehicle.cargoOwner}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.idCardNumber && (
                            <div className="flex items-start gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">No. KTP/SIM:</span>
                                <span className="font-mono">{vehicle.idCardNumber}</span>
                              </div>
                            </div>
                          )}
                          {vehicle.secondCargo && (
                            <div className="flex items-start gap-2">
                              <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px]">Muatan Sekunder:</span>
                                <span>{vehicle.secondCargo}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Duration outside - now - exitTime (how long since leaving) */}
                      {(() => {
                        const exitDate = safeParseDate(vehicle.exitTime);
                        const now = new Date();
                        const diffMs = exitDate ? Math.max(0, now.getTime() - exitDate.getTime()) : 0;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        const durationPercent = Math.min((diffMins / 480) * 100, 100);

                        return (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500">Lama di Luar</span>
                              <span className="font-medium text-teal-600">
                                {diffMins <= 0 ? 'Baru keluar' : formatDuration(diffMins)}
                              </span>
                            </div>
                            <Progress
                              value={durationPercent}
                              className="h-1.5 [&>div]:bg-teal-500"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Belum ada kendaraan keluar</p>
            <p className="text-sm">Belum ada kendaraan yang keluar dari area pada periode terpilih</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RECENT ACTIVITIES TIMELINE
// =============================================================================

interface ActivitiesTimelineProps {
  activities: SatpamActivity[];
  loading: boolean;
}

function ActivitiesTimeline({ activities, loading }: ActivitiesTimelineProps) {
  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'VEHICLE_ENTRY':
        return { icon: LogIn, color: 'bg-green-500', bgLight: 'bg-green-50', text: 'text-green-700' };
      case 'VEHICLE_EXIT':
        return { icon: LogOut, color: 'bg-blue-500', bgLight: 'bg-blue-50', text: 'text-blue-700' };
      case 'GUEST_REGISTERED':
        return { icon: UserCheck, color: 'bg-purple-500', bgLight: 'bg-purple-50', text: 'text-purple-700' };
      case 'QR_SCANNED':
        return { icon: QrCode, color: 'bg-indigo-500', bgLight: 'bg-indigo-50', text: 'text-indigo-700' };
      case 'OVERSTAY_ALERT':
        return { icon: AlertTriangle, color: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-700' };
      case 'DATA_SYNCED':
        return { icon: RefreshCw, color: 'bg-slate-500', bgLight: 'bg-slate-50', text: 'text-slate-700' };
      default:
        return { icon: Activity, color: 'bg-slate-500', bgLight: 'bg-slate-50', text: 'text-slate-700' };
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-red-500" />
          Aktivitas Terbaru
        </CardTitle>
        <CardDescription>Log kegiatan gerbang dalam periode terpilih</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="relative space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

            {activities.slice(0, 10).map((activity, index) => {
              const config = getActivityConfig(activity.type);
              const Icon = config.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative flex gap-3 py-3"
                >
                  <div className={`relative z-10 rounded-full p-1.5 ${config.color} h-fit`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.title}
                      </p>
                      {activity.generationIntent && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4 font-semibold uppercase',
                            activity.generationIntent === 'ENTRY'
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          )}
                        >
                          {activity.generationIntent === 'ENTRY' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      )}
                    </div>
                    {(activity.description || activity.gate) && (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {activity.description && (
                          <p className="text-xs text-slate-500 truncate">
                            {activity.description}
                          </p>
                        )}
                        {activity.gate && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            Gate: {activity.gate}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada aktivitas pada periode terpilih</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SHIFT INFO WIDGET
// =============================================================================

interface ShiftInfoWidgetProps {
  shiftInfo: ShiftInfo | null;
  stats: SatpamDashboardStats | null;
  loading: boolean;
}

function ShiftInfoWidget({ shiftInfo, stats, loading }: ShiftInfoWidgetProps) {
  const calculateShiftProgress = () => {
    if (!shiftInfo?.shiftStart || !shiftInfo?.shiftEnd) return 0;
    const now = new Date();
    const start = new Date(shiftInfo.shiftStart);
    const end = new Date(shiftInfo.shiftEnd);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const shiftProgress = calculateShiftProgress();

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          <span className="font-semibold">{shiftInfo?.shiftName || 'Shift Aktif'}</span>
        </div>
      </div>
      <CardContent className="p-5">

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress value={shiftProgress} className="h-2 [&>div]:bg-red-500" />
          <p className="text-xs text-slate-400 mt-1 text-right">{Math.round(shiftProgress)}% selesai</p>
        </div>

        {/* Shift Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <LogIn className="h-4 w-4" />
              <span className="text-lg font-bold">{stats?.todayEntries || 0}</span>
            </div>
            <p className="text-xs text-green-700">Masuk</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <LogOut className="h-4 w-4" />
              <span className="text-lg font-bold">{stats?.todayExits || 0}</span>
            </div>
            <p className="text-xs text-blue-700">Keluar</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// MAIN SATPAM DASHBOARD COMPONENT
// =============================================================================

function SatpamDashboard({ role }: RoleDashboardProps) {
  const { loading: dashboardLoading } = useDashboard();
  const apolloClient = useApolloClient();
  const gateCheckService = getGateCheckService(apolloClient);

  // State for dashboard data
  const [dashboardData, setDashboardData] = useState<SatpamDashboardData | null>(null);
  const [vehiclesOutside, setVehiclesOutside] = useState<VehicleOutsideInfo[]>([]);
  const [vehiclesCompleted, setVehiclesCompleted] = useState<VehicleCompletedInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const initialDateRange = getCurrentMonthToTodayRange();
  const [dateFrom, setDateFrom] = useState(initialDateRange.from);
  const [dateTo, setDateTo] = useState(initialDateRange.to);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data and exited vehicles in parallel
      const data = await gateCheckService.getSatpamDashboard();

      if (data) {
        setDashboardData(data);
        setVehiclesOutside(data.vehiclesOutside || []);
        setVehiclesCompleted(data.vehiclesCompleted || []);
        setLastUpdate(new Date());
      } else {
        // Fallback to stats-only
        const stats = await gateCheckService.getSatpamStats();
        if (stats) {
          setDashboardData({
            user: { id: '', username: '', name: '', role: 'SATPAM' },
            posInfo: { posNumber: 'POS-1', posName: 'Gate Utama', companyId: '', companyName: '', isActive: true },
            stats,
            vehiclesInside: [],
            vehiclesOutside: [],
            vehiclesCompleted: [],
            recentActivities: [],
            syncStatus: { isOnline: true, pendingSyncCount: 0, failedSyncCount: 0, photosPendingUpload: 0, uniqueDeviceCount: 0 },
            shiftInfo: { shiftName: 'Shift Aktif', shiftStart: '', shiftEnd: '', entriesThisShift: 0, exitsThisShift: 0 },
          });
          setVehiclesOutside([]);
          setLastUpdate(new Date());
        }
      }
    } catch (err) {
      console.error('Error fetching satpam dashboard data:', err);
      setError('Gagal memuat data dashboard. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = dashboardData?.stats || null;
  const vehiclesInside = dashboardData?.vehiclesInside || [];
  const vehiclesComp = dashboardData?.vehiclesCompleted || vehiclesCompleted || [];
  const recentActivities = dashboardData?.recentActivities || [];
  const syncStatus = dashboardData?.syncStatus || null;
  const shiftInfo = dashboardData?.shiftInfo || null;
  const posInfo = dashboardData?.posInfo;

  const selectedDateRange = useMemo(() => {
    const from = toDateBoundary(dateFrom, 'start');
    const to = toDateBoundary(dateTo, 'end');

    return { from, to };
  }, [dateFrom, dateTo]);

  const isDateFilterActive = Boolean(selectedDateRange.from || selectedDateRange.to);

  const filteredVehiclesInside = useMemo(
    () => vehiclesInside.filter((vehicle) => isDateWithinRange(vehicle.entryTime, selectedDateRange)),
    [vehiclesInside, selectedDateRange]
  );

  const filteredVehiclesOutside = useMemo(
    () => vehiclesOutside.filter((vehicle) => isDateWithinRange(vehicle.exitTime, selectedDateRange)),
    [vehiclesOutside, selectedDateRange]
  );

  const filteredVehiclesCompleted = useMemo(
    () =>
      vehiclesComp.filter((vehicle) =>
        isDateWithinRange(vehicle.exitTime || vehicle.entryTime, selectedDateRange)
      ),
    [vehiclesComp, selectedDateRange]
  );

  const filteredActivities = useMemo(
    () => recentActivities.filter((activity) => isDateWithinRange(activity.timestamp, selectedDateRange)),
    [recentActivities, selectedDateRange]
  );

  const overstayCountFromFilter = useMemo(
    () =>
      filteredVehiclesInside.filter((vehicle) => {
        if (vehicle.isOverstay) return true;
        const entry = safeParseDate(vehicle.entryTime);
        if (!entry) return false;
        const durationMinutes = (Date.now() - entry.getTime()) / (1000 * 60);
        return durationMinutes > 480;
      }).length,
    [filteredVehiclesInside]
  );

  const missingExitCountFromFilter = useMemo(
    () =>
      filteredVehiclesInside.filter((vehicle) => {
        const entry = safeParseDate(vehicle.entryTime);
        if (!entry) return false;
        const durationMinutes = (Date.now() - entry.getTime()) / (1000 * 60);
        return durationMinutes > 1440;
      }).length,
    [filteredVehiclesInside]
  );

  const displayStats = useMemo(() => {
    if (!stats) return null;
    if (!isDateFilterActive) return stats;

    return {
      ...stats,
      vehiclesInside: filteredVehiclesInside.length,
      vehiclesOutside: filteredVehiclesOutside.length,
      overstayCount: overstayCountFromFilter,
      missingExitCount: missingExitCountFromFilter,
    };
  }, [
    stats,
    isDateFilterActive,
    filteredVehiclesInside.length,
    filteredVehiclesOutside.length,
    overstayCountFromFilter,
    missingExitCountFromFilter,
  ]);

  // Loading state
  if (dashboardLoading || (loading && !dashboardData)) {
    return (
      <SatpamDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Memuat dashboard...</p>
          </div>
        </div>
      </SatpamDashboardLayout>
    );
  }

  return (
    <SatpamDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Kontrol Keamanan</h1>
              {syncStatus?.isOnline ? (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  Offline
                </span>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Update: {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
            )}
            <Button
              onClick={fetchDashboardData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </motion.div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              Filter Range Tanggal
            </CardTitle>
            <CardDescription>
              Filter berlaku untuk metrik utama, tabel kendaraan, dan timeline aktivitas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const defaultRange = getCurrentMonthToTodayRange();
                  setDateFrom(defaultRange.from);
                  setDateTo(defaultRange.to);
                }}
              >
                Reset
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {isDateFilterActive
                ? `Menampilkan data dari ${dateFrom || 'awal'} sampai ${dateTo || 'akhir'}.`
                : 'Default: awal bulan sampai hari ini.'}
            </p>
          </CardContent>
        </Card>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Kendaraan di Dalam"
            value={displayStats?.vehiclesInside || 0}
            description="Masuk pada periode terpilih dan masih di area perkebunan"
            icon={Truck}
            color="blue"
            loading={loading}
            index={0}
          />
          <MetricCard
            title="Kendaraan di Luar"
            value={displayStats?.vehiclesOutside || 0}
            description="Sudah keluar dari estate pada periode terpilih"
            icon={Truck}
            color="teal"
            loading={loading}
            index={1}
          />
          <MetricCard
            title="Overstay"
            value={displayStats?.overstayCount || 0}
            description="Di dalam > 8 jam"
            icon={AlertTriangle}
            color="orange"
            loading={loading}
            index={2}
          />
          <MetricCard
            title="Hilang Exit"
            value={displayStats?.missingExitCount || 0}
            description="Entry > 24 jam tanpa exit"
            icon={AlertTriangle}
            color="red"
            loading={loading}
            index={3}
          />
          <MetricCard
            title="Hilang Entry"
            value={displayStats?.missingEntryCount || 0}
            description="Exit tanpa data entry"
            icon={AlertTriangle}
            color="red"
            loading={loading}
            index={4}
          />
        </div>

        {/* Main Content Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Left Column - Vehicles & Activities */}
          <div className="lg:col-span-2 space-y-6">
            <VehiclesTable vehicles={filteredVehiclesInside} loading={loading} />
            <VehiclesCompletedTable vehicles={filteredVehiclesCompleted} loading={loading} />
            <VehiclesOutsideTable vehicles={filteredVehiclesOutside} loading={loading} />
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-4">
            <ShiftInfoWidget shiftInfo={shiftInfo} stats={displayStats} loading={loading} />
            <ActivitiesTimeline activities={filteredActivities} loading={loading} />
          </div>
        </motion.div>
      </div>
    </SatpamDashboardLayout>
  );
}

export default SatpamDashboard;
