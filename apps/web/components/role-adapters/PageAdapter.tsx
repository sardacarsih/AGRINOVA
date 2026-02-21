import React, { ComponentType, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import type { UserRole } from '@/types/user';

// UI Components for AREA_MANAGER Gate Check Dashboard
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Charts
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Icons
import {
  Globe, Building, Truck, AlertTriangle, TrendingUp, TrendingDown, Minus,
  LogIn, LogOut, Clock, Users, Activity, Shield, MapPin
} from 'lucide-react';

// Layout
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import {
  GET_SATPAM_HISTORY,
  GET_SATPAM_STATS,
  GET_VEHICLES_INSIDE,
  SATPAM_OVERSTAY_ALERT,
  SATPAM_VEHICLE_ENTRY,
  SATPAM_VEHICLE_EXIT,
  SatpamPhoto,
  SatpamDashboardStats,
  SatpamHistoryResponse,
  VehicleInsideInfo,
} from '@/lib/apollo/queries/gate-check';
import { useCompanyScope } from '@/contexts/company-scope-context';
import { resolveMediaUrl } from '@/lib/utils/media-url';

// Props type for page components
export interface PageComponentProps {
  user?: any;
  locale?: string;
}

// ============================================================================
// AREA_MANAGER Gate Check Dashboard - Types and Mockup Data
// ============================================================================

interface RegionalGateCheckStats {
  totalActivities: number;
  totalEntries: number;
  totalExits: number;
  vehiclesInside: number;
  overstayCount: number;
  companiesActive: number;
}

interface CompanyGateCheckMetrics {
  companyId: string;
  companyName: string;
  todayEntries: number;
  todayExits: number;
  vehiclesInside: number;
  overstayCount: number;
  performanceScore: number;
  trend: 'up' | 'down' | 'stable';
}

interface RegionalVehicle {
  id: string;
  companyId?: string;
  vehiclePlate: string;
  driverName: string;
  vehicleType: string;
  companyName: string;
  entryGate?: string;
  entryTime?: string;
  durationMinutes: number;
  isOverstay: boolean;
  vehiclePhotoUrl?: string;
  vehiclePhotos?: SatpamPhoto[];
}

interface RegionalActivity {
  id: string;
  companyId?: string;
  type: 'VEHICLE_ENTRY' | 'VEHICLE_EXIT' | 'OVERSTAY_ALERT';
  title: string;
  description: string;
  companyName: string;
  timestamp: string;
  gate?: string;
  eventTime?: string;
  vehiclePhotoUrl?: string;
  vehiclePhotos?: SatpamPhoto[];
  vehiclePlate?: string;
}

interface TrendData {
  date: string;
  entries: number;
  exits: number;
  overstays: number;
}

const TREND_DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const parseTimestamp = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  // Fallback for backend time formats like "YYYY-MM-DD HH:mm:ss"
  const normalized = value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T')
    : value;
  const fallbackParsed = new Date(normalized);
  return Number.isNaN(fallbackParsed.getTime()) ? null : fallbackParsed;
};

const isSubscriptionNotImplementedError = (error: unknown): boolean => {
  const messages: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      messages.push(value.toLowerCase());
    }
  };

  if (error && typeof error === 'object') {
    const normalizedError = error as {
      message?: unknown;
      graphQLErrors?: Array<{ message?: unknown }>;
      networkError?: { message?: unknown };
      cause?: { message?: unknown };
    };

    collect(normalizedError.message);
    collect(normalizedError.networkError?.message);
    collect(normalizedError.cause?.message);

    if (Array.isArray(normalizedError.graphQLErrors)) {
      normalizedError.graphQLErrors.forEach((graphQLError) => collect(graphQLError?.message));
    }
  }

  return messages.some((message) =>
    message.includes('subscriptions not implemented') ||
    message.includes('subscription not implemented')
  );
};

const isSubscriptionAccessDeniedError = (error: unknown): boolean => {
  const messages: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      messages.push(value.toLowerCase());
    }
  };

  if (error && typeof error === 'object') {
    const normalizedError = error as {
      message?: unknown;
      graphQLErrors?: Array<{ message?: unknown }>;
      networkError?: { message?: unknown };
      cause?: { message?: unknown };
    };

    collect(normalizedError.message);
    collect(normalizedError.networkError?.message);
    collect(normalizedError.cause?.message);

    if (Array.isArray(normalizedError.graphQLErrors)) {
      normalizedError.graphQLErrors.forEach((graphQLError) => collect(graphQLError?.message));
    }
  }

  return messages.some((message) =>
    message.includes('access denied') ||
    message.includes('not authorized') ||
    message.includes('forbidden') ||
    message.includes('unauthenticated') ||
    message.includes('authentication required')
  );
};

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeGateIntent = (intent?: string | null): 'ENTRY' | 'EXIT' | null => {
  if (!intent) return null;
  const normalized = intent.toString().trim().toUpperCase();
  if (normalized === 'ENTRY') return 'ENTRY';
  if (normalized === 'EXIT') return 'EXIT';
  return null;
};

const normalizeOptionalText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const normalized = value.toString().trim();
  return normalized === '' ? undefined : normalized;
};

const formatRelativeTimeID = (value?: string | null): string => {
  const date = parseTimestamp(value);
  if (!date) return '-';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Baru saja';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
};

const formatDateTimeID = (value?: string | null): string => {
  const date = parseTimestamp(value);
  if (!date) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('id-ID', { month: 'short' });
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hour}.${minute}`;
};

const toISODateBoundary = (dateValue: string, boundary: 'start' | 'end'): string | undefined => {
  if (!dateValue) return undefined;
  const timePart = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  const parsed = new Date(`${dateValue}T${timePart}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthDateRange = (): { from: string; to: string } => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: formatDateForInput(firstDay),
    to: formatDateForInput(lastDay),
  };
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const resolveDurationMinutes = (entryTime?: string | null, apiDurationMinutes?: number): number => {
  const safeApiDuration = Number.isFinite(apiDurationMinutes)
    ? Math.max(0, Math.floor(apiDurationMinutes as number))
    : 0;

  const parsedEntryTime = parseTimestamp(entryTime);
  if (!parsedEntryTime) {
    return safeApiDuration;
  }

  const liveDuration = Math.max(0, Math.floor((Date.now() - parsedEntryTime.getTime()) / 60000));

  if (safeApiDuration === 0) {
    return liveDuration;
  }

  const drift = Math.abs(liveDuration - safeApiDuration);
  if (drift > 15) {
    return liveDuration;
  }

  return Math.max(liveDuration, safeApiDuration);
};

const formatDurationID = (durationMinutes: number): string => {
  const safeDuration = Math.max(0, Math.floor(durationMinutes || 0));
  if (safeDuration < 60) return `${safeDuration} menit`;

  const days = Math.floor(safeDuration / 1440);
  const hours = Math.floor((safeDuration % 1440) / 60);
  const minutes = safeDuration % 60;

  if (days > 0) {
    return minutes > 0
      ? `${days} hari ${hours} jam ${minutes} menit`
      : `${days} hari ${hours} jam`;
  }

  return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
};

const BROKEN_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";

const getVehiclePhotoUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  return resolveMediaUrl(url);
};

const getPhotoTypeLabel = (photoType?: string): string => {
  if (photoType === 'FRONT') return 'Tampak Depan';
  if (photoType === 'BACK') return 'Tampak Belakang';
  return photoType || 'Foto Kendaraan';
};

interface VehiclePhotoPreviewProps {
  primaryPhotoUrl?: string;
  photos?: SatpamPhoto[];
  vehiclePlate?: string;
  sizeClassName?: string;
  borderClassName?: string;
  fallbackClassName?: string;
}

const VehiclePhotoPreview = ({
  primaryPhotoUrl,
  photos,
  vehiclePlate,
  sizeClassName = 'h-14 w-14',
  borderClassName = 'border-gray-200',
  fallbackClassName = 'bg-gray-100 text-gray-400',
}: VehiclePhotoPreviewProps) => {
  const validPhotos = (photos || []).filter((photo) => Boolean(photo?.photoUrl));
  const previewPhotos = validPhotos.length > 0
    ? validPhotos
    : primaryPhotoUrl
      ? [{
        id: `single-${vehiclePlate || 'vehicle'}`,
        photoId: '',
        photoType: 'PHOTO',
        photoUrl: primaryPhotoUrl,
        takenAt: '',
      }]
      : [];
  const previewPhotoUrls = previewPhotos
    .map((photo) => getVehiclePhotoUrl(photo.photoUrl))
    .filter((url): url is string => Boolean(url));

  if (previewPhotos.length === 0) {
    return (
      <div className={`${sizeClassName} shrink-0 overflow-hidden rounded-md border ${borderClassName} bg-white`}>
        <div className={`flex h-full w-full items-center justify-center ${fallbackClassName}`}>
          <Truck className="h-5 w-5" />
        </div>
      </div>
    );
  }

  const firstPhotoUrl = previewPhotoUrls[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`${sizeClassName} group relative shrink-0 overflow-hidden rounded-md border ${borderClassName} bg-white transition-shadow hover:shadow-md`}
          title={`Lihat foto kendaraan${vehiclePlate ? ` ${vehiclePlate}` : ''}`}
        >
          {firstPhotoUrl ? (
            <img
              src={firstPhotoUrl}
              alt={`Foto kendaraan ${vehiclePlate || ''}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(event) => {
                const target = event.currentTarget;
                const currentIndex = Number(target.dataset.fallbackIndex || '0');
                const nextIndex = currentIndex + 1;

                if (nextIndex < previewPhotoUrls.length) {
                  target.dataset.fallbackIndex = String(nextIndex);
                  target.src = previewPhotoUrls[nextIndex];
                  return;
                }

                target.onerror = null;
                target.src = BROKEN_IMAGE_PLACEHOLDER;
              }}
              data-fallback-index="0"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${fallbackClassName}`}>
              <Truck className="h-5 w-5" />
            </div>
          )}
          {previewPhotos.length > 1 && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
              {previewPhotos.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto Kendaraan{vehiclePlate ? `: ${vehiclePlate}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {previewPhotos.map((photo, index) => (
            <div key={photo.id || `${photo.photoUrl}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] bg-slate-50 uppercase tracking-wider">
                  {getPhotoTypeLabel(photo.photoType)}
                </Badge>
                {photo.photoId && (
                  <span className="text-[10px] text-slate-400 font-mono">{photo.photoId}</span>
                )}
              </div>
              <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={getVehiclePhotoUrl(photo.photoUrl)}
                  alt={`Foto kendaraan ${vehiclePlate || ''} - ${getPhotoTypeLabel(photo.photoType)}`}
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    const target = event.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = BROKEN_IMAGE_PLACEHOLDER;
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// End of AREA_MANAGER Gate Check Dashboard Types and Data
// ============================================================================

// Complete role-specific page components with completely different layouts per role
// Each page adapts completely based on user role

// Users page components - completely different interfaces per role
// TEMPORARY: Using simple placeholder components until new ones are created

// Simple placeholder components for each role
const SuperAdminUsersPage = lazy(() => import('../../features/user-management/components/SuperAdminUsersPage'));

const CompanyAdminUsersPage = lazy(() => import('../../features/user-management/components/CompanyAdminUsersPage'));
const ManagerUsersPage = lazy(() => import('../../features/manager-dashboard/components/ManagerDivisionProductionBudgetPage'));
const WorkersDashboardPage = lazy(() => import('../../features/workers/components/WorkersDashboard').then((module) => ({ default: module.WorkersDashboard })));

const AreaManagerUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Users</h1>
    <p>Area Manager user management page - Coming soon</p>
  </div>
);

const AsistenUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Team Members</h1>
    <p>Assistant user management page - Coming soon</p>
  </div>
);

const MandorUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Field Workers</h1>
    <p>Mandor worker management page - Coming soon</p>
  </div>
);

const SatpamUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Security Team</h1>
    <p>Satpam team management page - Coming soon</p>
  </div>
);

const TimbanganUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Weighing Team</h1>
    <p>Timbangan team management page - Coming soon</p>
  </div>
);

const GradingUsersPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Quality Team</h1>
    <p>Grading team management page - Coming soon</p>
  </div>
);

export const USERS_PAGE_COMPONENTS: Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>> = {
  'SUPER_ADMIN': SuperAdminUsersPage,
  'COMPANY_ADMIN': CompanyAdminUsersPage,
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerUsersPage })),
  'MANAGER': ManagerUsersPage,
  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenUsersPage })),
  'MANDOR': lazy(() => Promise.resolve({ default: MandorUsersPage })),
  'SATPAM': lazy(() => Promise.resolve({ default: SatpamUsersPage })),
  'TIMBANGAN': lazy(() => Promise.resolve({ default: TimbanganUsersPage })),
  'GRADING': lazy(() => Promise.resolve({ default: GradingUsersPage })),
};

// Employees page components - currently scoped for company admin
export const EMPLOYEES_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'COMPANY_ADMIN': WorkersDashboardPage,
  'MANAGER': WorkersDashboardPage,
  'ASISTEN': WorkersDashboardPage,
};

// Reports page components - role-specific reporting interfaces
// TEMPORARY: Using placeholder components

const SuperAdminReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Global Reports</h1>
    <p>Super Admin reporting page - Coming soon</p>
  </div>
);

const CompanyAdminReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Company Reports</h1>
    <p>Company Admin reporting page - Coming soon</p>
  </div>
);

const AreaManagerReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Reports</h1>
    <p>Area Manager reporting page - Coming soon</p>
  </div>
);

const ManagerReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Estate Reports</h1>
    <p>Manager reporting page - Coming soon</p>
  </div>
);

const AsistenReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Team Reports</h1>
    <p>Assistant reporting page - Coming soon</p>
  </div>
);

const MandorReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Harvest Reports</h1>
    <p>Mandor reporting page - Coming soon</p>
  </div>
);

const SatpamReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Security Reports</h1>
    <p>Satpam reporting page - Coming soon</p>
  </div>
);

const TimbanganReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Weighing Reports</h1>
    <p>Timbangan reporting page - Coming soon</p>
  </div>
);

const GradingReportsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Quality Reports</h1>
    <p>Grading reporting page - Coming soon</p>
  </div>
);

export const REPORTS_PAGE_COMPONENTS: Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>> = {
  'SUPER_ADMIN': lazy(() => Promise.resolve({ default: SuperAdminReportsPage })),
  'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: CompanyAdminReportsPage })),
  'AREA_MANAGER': lazy(() => import('../../features/manager-dashboard/components/ManagerBkmReportPage')),
  'MANAGER': lazy(() => import('../../features/manager-dashboard/components/ManagerBkmReportPage')),

  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenReportsPage })),
  'MANDOR': lazy(() => Promise.resolve({ default: MandorReportsPage })),
  'SATPAM': lazy(() => Promise.resolve({ default: SatpamReportsPage })),
  'TIMBANGAN': lazy(() => Promise.resolve({ default: TimbanganReportsPage })),
  'GRADING': lazy(() => Promise.resolve({ default: GradingReportsPage })),
};

// Settings page components - role-specific configuration interfaces
// TEMPORARY: Using placeholder components

const SuperAdminSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">System Settings</h1>
    <p>Super Admin settings page - Coming soon</p>
  </div>
);

const CompanyAdminSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Company Settings</h1>
    <p>Company Admin settings page - Coming soon</p>
  </div>
);

const AreaManagerSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Settings</h1>
    <p>Area Manager settings page - Coming soon</p>
  </div>
);

const ManagerSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Estate Settings</h1>
    <p>Manager settings page - Coming soon</p>
  </div>
);

const AsistenSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Team Settings</h1>
    <p>Assistant settings page - Coming soon</p>
  </div>
);

const MandorSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Field Settings</h1>
    <p>Mandor settings page - Coming soon</p>
  </div>
);

const SatpamSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Security Settings</h1>
    <p>Satpam settings page - Coming soon</p>
  </div>
);

const TimbanganSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Weighing Settings</h1>
    <p>Timbangan settings page - Coming soon</p>
  </div>
);

const GradingSettingsPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Quality Settings</h1>
    <p>Grading settings page - Coming soon</p>
  </div>
);

export const SETTINGS_PAGE_COMPONENTS: Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>> = {
  'SUPER_ADMIN': lazy(() => Promise.resolve({ default: SuperAdminSettingsPage })),
  'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: CompanyAdminSettingsPage })),
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerSettingsPage })),
  'MANAGER': lazy(() => Promise.resolve({ default: ManagerSettingsPage })),
  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenSettingsPage })),
  'MANDOR': lazy(() => Promise.resolve({ default: MandorSettingsPage })),
  'SATPAM': lazy(() => Promise.resolve({ default: SatpamSettingsPage })),
  'TIMBANGAN': lazy(() => Promise.resolve({ default: TimbanganSettingsPage })),
  'GRADING': lazy(() => Promise.resolve({ default: GradingSettingsPage })),
};

// Companies page components - only available for admin roles
// TEMPORARY: Using placeholder components

const SuperAdminCompaniesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">All Companies</h1>
    <p>Super Admin companies management page - Coming soon</p>
  </div>
);

const CompanyAdminCompaniesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Company Management</h1>
    <p>Company Admin companies page - Coming soon</p>
  </div>
);

const AreaManagerCompaniesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Companies</h1>
    <p>Area Manager companies page - Coming soon</p>
  </div>
);

export const COMPANIES_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'SUPER_ADMIN': lazy(() => Promise.resolve({ default: SuperAdminCompaniesPage })),
  'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: CompanyAdminCompaniesPage })),
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerCompaniesPage })),
};

// Estates page components - available for management roles
// TEMPORARY: Using placeholder components

const CompanyAdminEstatesPage = lazy(() => import('@/features/master-data/components/CompanyAdminEstatesPage'));
const CompanyAdminDivisionsPage = lazy(() => import('@/features/master-data/components/CompanyAdminDivisionsPage'));
const CompanyAdminBlocksTabsPage = lazy(() => import('@/features/master-data/components/CompanyAdminBlocksTabsPage'));
const CompanyAdminTarifBlokPage = lazy(() => import('@/features/master-data/components/CompanyAdminTarifBlokPage'));
const VehicleManagementPage = lazy(() => import('@/features/vehicles/components/VehicleManagementPage'));

const AreaManagerEstatesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Estates</h1>
    <p>Area Manager estates page - Coming soon</p>
  </div>
);

const ManagerEstatesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Estate Management</h1>
    <p>Manager estates page - Coming soon</p>
  </div>
);

const AsistenEstatesPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Division Estates</h1>
    <p>Assistant estates page - Coming soon</p>
  </div>
);

export const ESTATES_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'COMPANY_ADMIN': CompanyAdminEstatesPage,
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerEstatesPage })),
  'MANAGER': lazy(() => Promise.resolve({ default: ManagerEstatesPage })),
  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenEstatesPage })),
};

export const DIVISIONS_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'COMPANY_ADMIN': CompanyAdminDivisionsPage,
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Regional Divisions</h1><p>Area Manager divisions page - Coming soon</p></div> })),
  'MANAGER': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Estate Divisions</h1><p>Manager divisions page - Coming soon</p></div> })),
  'ASISTEN': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Assigned Divisions</h1><p>Asisten divisions page - Coming soon</p></div> })),
};

export const BLOCKS_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'COMPANY_ADMIN': CompanyAdminBlocksTabsPage,
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Regional Blocks</h1><p>Area Manager blocks page - Coming soon</p></div> })),
  'MANAGER': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Estate Blocks</h1><p>Manager blocks page - Coming soon</p></div> })),
  'ASISTEN': lazy(() => Promise.resolve({ default: () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Division Blocks</h1><p>Asisten blocks page - Coming soon</p></div> })),
};

export const TARIF_BLOK_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'COMPANY_ADMIN': CompanyAdminTarifBlokPage,
};

export const VEHICLES_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'SUPER_ADMIN': VehicleManagementPage,
  'COMPANY_ADMIN': VehicleManagementPage,
  'AREA_MANAGER': VehicleManagementPage,
  'MANAGER': VehicleManagementPage,
  'SATPAM': VehicleManagementPage,
};

// Harvest page components - available for field operations
// TEMPORARY: Using placeholder components

const SuperAdminHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Global Harvest</h1>
    <p>Super Admin harvest management page - Coming soon</p>
  </div>
);

const CompanyAdminHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Company Harvest</h1>
    <p>Company Admin harvest page - Coming soon</p>
  </div>
);

const AreaManagerHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Regional Harvest</h1>
    <p>Area Manager harvest page - Coming soon</p>
  </div>
);

const ManagerHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Estate Harvest</h1>
    <p>Manager harvest page - Coming soon</p>
  </div>
);

const AsistenHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Harvest Approval</h1>
    <p>Assistant harvest approval page - Coming soon</p>
  </div>
);

const MandorHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Harvest Input</h1>
    <p>Mandor harvest input page - Coming soon</p>
  </div>
);

const TimbanganHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Weighing Operations</h1>
    <p>Timbangan weighing operations page - Coming soon</p>
  </div>
);

const GradingHarvestPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Quality Assessment</h1>
    <p>Grading quality assessment page - Coming soon</p>
  </div>
);

export const HARVEST_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'SUPER_ADMIN': lazy(() => Promise.resolve({ default: SuperAdminHarvestPage })),
  'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: CompanyAdminHarvestPage })),
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerHarvestPage })),
  'MANAGER': lazy(() => Promise.resolve({ default: ManagerHarvestPage })),
  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenHarvestPage })),
  'MANDOR': lazy(() => Promise.resolve({ default: MandorHarvestPage })),
  'TIMBANGAN': lazy(() => Promise.resolve({ default: TimbanganHarvestPage })),
  'GRADING': lazy(() => Promise.resolve({ default: GradingHarvestPage })),
};

// Gate check page components - available for security and field roles
// TEMPORARY: Using placeholder components

const SuperAdminGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Global Gate Check</h1>
    <p>Super Admin gate check page - Coming soon</p>
  </div>
);

const CompanyAdminGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Company Gate Check</h1>
    <p>Company Admin gate check page - Coming soon</p>
  </div>
);

const AreaManagerGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => {
  const { effectiveCompanyId } = useCompanyScope();

  const normalizedRole = String(user?.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const isManagerView = normalizedRole === 'MANAGER';
  const canConsumeRealtimeGateEvents = normalizedRole === 'AREA_MANAGER' || isManagerView;
  const [gateRealtimeUnavailable, setGateRealtimeUnavailable] = useState(false);
  const canUseGateRealtimeSubscription = canConsumeRealtimeGateEvents && !gateRealtimeUnavailable;
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignedCompanyNames = useMemo<string[]>(
    () => (Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : []),
    [user?.assignedCompanyNames]
  );

  const allAssignedCompanyIds = useMemo<string[]>(
    () => (Array.isArray(user?.assignedCompanies) && user.assignedCompanies.length > 0
      ? user.assignedCompanies
      : user?.companyId
        ? [user.companyId]
        : []),
    [user?.assignedCompanies, user?.companyId]
  );

  const assignedCompanyIds = useMemo(() => {
    const uniqueIds = Array.from(
      new Set(
        allAssignedCompanyIds
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    );

    if (isManagerView) {
      return uniqueIds.slice(0, 1);
    }

    if (normalizedRole === 'AREA_MANAGER' && effectiveCompanyId) {
      return [effectiveCompanyId];
    }

    return uniqueIds;
  }, [allAssignedCompanyIds, effectiveCompanyId, isManagerView, normalizedRole]);

  const fallbackCompanyId = assignedCompanyIds.length > 1
    ? '__ALL_ASSIGNED_COMPANIES__'
    : (user?.companyId || assignedCompanyIds[0] || 'current-company');

  const companyDirectory = useMemo(() => {
    const map = new Map<string, string>();

    allAssignedCompanyIds.forEach((id, index) => {
      const normalizedId = String(id || '').trim();
      if (!normalizedId) return;
      map.set(normalizedId, assignedCompanyNames[index] || `Perusahaan ${index + 1}`);
    });

    if (user?.companyId && user?.company) {
      map.set(user.companyId, user.company);
    }

    return map;
  }, [allAssignedCompanyIds, assignedCompanyNames, user?.companyId, user?.company]);

  const getCompanyName = (companyId?: string | null): string => {
    if (companyId === '__ALL_ASSIGNED_COMPANIES__') return 'Semua Perusahaan (Gabungan)';
    if (!companyId) return user?.company || 'Perusahaan';
    return companyDirectory.get(companyId) || user?.company || 'Perusahaan';
  };

  const totalAssignedCompanies = Math.max(
    1,
    assignedCompanyIds.length || assignedCompanyNames.length || 0
  );

  const [dateFrom, setDateFrom] = useState(() => getCurrentMonthDateRange().from);
  const [dateTo, setDateTo] = useState(() => getCurrentMonthDateRange().to);
  const historyFilter = useMemo(
    () => {
      const filter: Record<string, unknown> = {
        page: 1,
        pageSize: 300,
        sortBy: 'ENTRY_TIME',
        sortDirection: 'DESC',
      };

      const dateFromISO = toISODateBoundary(dateFrom, 'start');
      const dateToISO = toISODateBoundary(dateTo, 'end');

      if (dateFromISO) {
        filter.dateFrom = dateFromISO;
      }
      if (dateToISO) {
        filter.dateTo = dateToISO;
      }

      return { filter };
    },
    [dateFrom, dateTo]
  );

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
    startPolling: startStatsPolling,
    stopPolling: stopStatsPolling,
  } = useQuery<{
    satpamDashboardStats: SatpamDashboardStats;
  }>(GET_SATPAM_STATS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const {
    data: vehiclesData,
    loading: vehiclesLoading,
    error: vehiclesError,
    refetch: refetchVehicles,
    startPolling: startVehiclesPolling,
    stopPolling: stopVehiclesPolling,
  } = useQuery<{
    vehiclesInside: VehicleInsideInfo[];
  }>(GET_VEHICLES_INSIDE, {
    variables: { search: '' },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
    startPolling: startHistoryPolling,
    stopPolling: stopHistoryPolling,
  } = useQuery<{
    satpamHistory: SatpamHistoryResponse;
  }>(GET_SATPAM_HISTORY, {
    variables: historyFilter,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      return;
    }

    realtimeRefreshTimerRef.current = setTimeout(() => {
      void Promise.allSettled([
        refetchStats(),
        refetchVehicles({ search: '' }),
        refetchHistory(),
      ]);

      realtimeRefreshTimerRef.current = null;
    }, 350);
  }, [refetchHistory, refetchStats, refetchVehicles]);

  useEffect(() => {
    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pollingIntervalMs = 30_000;
    startStatsPolling(pollingIntervalMs);
    startVehiclesPolling(pollingIntervalMs);
    startHistoryPolling(pollingIntervalMs);

    return () => {
      stopStatsPolling();
      stopVehiclesPolling();
      stopHistoryPolling();
    };
  }, [
    startHistoryPolling,
    startStatsPolling,
    startVehiclesPolling,
    stopHistoryPolling,
    stopStatsPolling,
    stopVehiclesPolling,
  ]);

  const handleGateRealtimeSubscriptionError = useCallback((eventName: string, error: unknown) => {
    if (isSubscriptionNotImplementedError(error) || isSubscriptionAccessDeniedError(error)) {
      setGateRealtimeUnavailable(true);
      return;
    }

    console.error(`Satpam ${eventName} subscription error:`, error);
  }, []);

  useSubscription(SATPAM_VEHICLE_ENTRY, {
    skip: !canUseGateRealtimeSubscription,
    onData: ({ data }) => {
      const entry = data.data?.satpamVehicleEntry;
      if (!entry) return;

      scheduleRealtimeRefresh();
    },
    onError: (error) => {
      handleGateRealtimeSubscriptionError('vehicle entry', error);
    },
  });

  useSubscription(SATPAM_VEHICLE_EXIT, {
    skip: !canUseGateRealtimeSubscription,
    onData: ({ data }) => {
      const exit = data.data?.satpamVehicleExit;
      if (!exit) return;

      scheduleRealtimeRefresh();
    },
    onError: (error) => {
      handleGateRealtimeSubscriptionError('vehicle exit', error);
    },
  });

  useSubscription(SATPAM_OVERSTAY_ALERT, {
    skip: !canUseGateRealtimeSubscription,
    onData: ({ data }) => {
      const overstay = data.data?.satpamOverstayAlert;
      if (!overstay) return;

      scheduleRealtimeRefresh();
    },
    onError: (error) => {
      handleGateRealtimeSubscriptionError('overstay', error);
    },
  });

  const scopedCompanyIds = useMemo(() => new Set(assignedCompanyIds), [assignedCompanyIds]);

  const hasError = Boolean(statsError || vehiclesError || historyError);
  const historyItems = useMemo(() => {
    const items = historyData?.satpamHistory?.items || [];
    if (scopedCompanyIds.size === 0) return items;

    return items.filter((item) => !item.companyId || scopedCompanyIds.has(item.companyId));
  }, [historyData, scopedCompanyIds]);
  const statsSummary = statsData?.satpamDashboardStats;
  const historySummary = historyData?.satpamHistory?.summary;
  const selectedDateRange = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return {
      from: from && !Number.isNaN(from.getTime()) ? from : null,
      to: to && !Number.isNaN(to.getTime()) ? to : null,
    };
  }, [dateFrom, dateTo]);
  const isDateFilterActive = Boolean(selectedDateRange.from || selectedDateRange.to);

  const historyGateLookup = useMemo(() => {
    const byRecordID = new Map<string, string>();
    const byVehiclePlate = new Map<string, string>();

    for (const item of historyItems) {
      const normalizedIntent = normalizeGateIntent(item.generationIntent);
      const gateFromIntent = normalizedIntent === 'EXIT'
        ? normalizeOptionalText(item.exitGate)
        : normalizeOptionalText(item.entryGate);
      const fallbackGate = normalizeOptionalText(item.gatePosition);
      const resolvedGate = gateFromIntent || fallbackGate;
      if (!resolvedGate) {
        continue;
      }

      const recordID = normalizeOptionalText(item.id);
      if (recordID && !byRecordID.has(recordID)) {
        byRecordID.set(recordID, resolvedGate);
      }

      const vehiclePlateKey = normalizeOptionalText(item.vehiclePlate)?.toUpperCase();
      if (vehiclePlateKey && !byVehiclePlate.has(vehiclePlateKey)) {
        byVehiclePlate.set(vehiclePlateKey, resolvedGate);
      }
    }

    return { byRecordID, byVehiclePlate };
  }, [historyItems]);

  const vehicles = useMemo<RegionalVehicle[]>(() => {
    const items = vehiclesData?.vehiclesInside || [];
    return items
      .filter((vehicle) => {
        if (scopedCompanyIds.size > 0 && vehicle.companyId && !scopedCompanyIds.has(vehicle.companyId)) {
          return false;
        }

        const entryTime = parseTimestamp(vehicle.entryTime);
        if (!entryTime) return true;
        if (selectedDateRange.from && entryTime < selectedDateRange.from) return false;
        if (selectedDateRange.to && entryTime > selectedDateRange.to) return false;
        return true;
      })
      .map((vehicle) => {
        const durationMinutes = resolveDurationMinutes(vehicle.entryTime, vehicle.durationMinutes);
        const recordID = normalizeOptionalText(vehicle.id);
        const vehiclePlateKey = normalizeOptionalText(vehicle.vehiclePlate)?.toUpperCase();
        const gateFromVehicleInside = normalizeOptionalText(vehicle.entryGate);
        const gateFromHistory = (recordID ? historyGateLookup.byRecordID.get(recordID) : undefined) ||
          (vehiclePlateKey ? historyGateLookup.byVehiclePlate.get(vehiclePlateKey) : undefined);

        return {
          id: vehicle.id,
          companyId: vehicle.companyId || fallbackCompanyId,
          vehiclePlate: vehicle.vehiclePlate,
          driverName: vehicle.driverName,
          vehicleType: vehicle.vehicleType,
          companyName: getCompanyName(vehicle.companyId || fallbackCompanyId),
          entryGate: gateFromVehicleInside || gateFromHistory,
          entryTime: vehicle.entryTime,
          durationMinutes,
          isOverstay: durationMinutes > 480 || Boolean(vehicle.isOverstay),
          vehiclePhotoUrl: vehicle.photoUrl || vehicle.photos?.[0]?.photoUrl,
          vehiclePhotos: vehicle.photos || [],
        };
      });
  }, [vehiclesData, fallbackCompanyId, companyDirectory, user?.company, selectedDateRange, historyGateLookup]);

  const trendData = useMemo<TrendData[]>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const timeline = new Map<string, TrendData>();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = toLocalDateKey(day);
      timeline.set(key, {
        date: TREND_DAY_LABELS[day.getDay()],
        entries: 0,
        exits: 0,
        overstays: 0,
      });
    }

    for (const item of historyItems) {
      const eventTimestamp =
        parseTimestamp(item.entryTime) ||
        parseTimestamp(item.exitTime) ||
        parseTimestamp(item.createdAt);

      if (!eventTimestamp || eventTimestamp < start) continue;

      const key = toLocalDateKey(eventTimestamp);
      const bucket = timeline.get(key);
      if (!bucket) continue;

      const normalizedIntent = normalizeGateIntent(item.generationIntent);
      if (normalizedIntent === 'ENTRY' || (!normalizedIntent && item.entryTime && !item.exitTime)) {
        bucket.entries += 1;
      } else if (normalizedIntent === 'EXIT' || (!normalizedIntent && Boolean(item.exitTime))) {
        bucket.exits += 1;
      }

      const entryTime = parseTimestamp(item.entryTime) || eventTimestamp;
      if (entryTime && !item.exitTime) {
        const durationMinutes = (Date.now() - entryTime.getTime()) / 60000;
        if (durationMinutes > 480) bucket.overstays += 1;
      }
    }

    return Array.from(timeline.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [historyItems]);

  const activities = useMemo<RegionalActivity[]>(() => {
    return historyItems
      .slice(0, 12)
      .map((item) => {
        const normalizedIntent = normalizeGateIntent(item.generationIntent);
        const type: RegionalActivity['type'] = normalizedIntent === 'EXIT'
          ? 'VEHICLE_EXIT'
          : 'VEHICLE_ENTRY';
        const currentCompanyID = item.companyId || fallbackCompanyId;
        const eventTimeRaw = normalizedIntent === 'EXIT'
          ? (item.exitTime || item.createdAt)
          : (item.entryTime || item.createdAt);
        const gateValue = normalizedIntent === 'EXIT'
          ? item.exitGate
          : item.entryGate;

        return {
          id: item.id,
          companyId: currentCompanyID,
          type,
          title: type === 'VEHICLE_EXIT' ? 'Kendaraan Keluar' : 'Kendaraan Masuk',
          description: `${item.vehiclePlate} - ${item.driverName}`,
          companyName: getCompanyName(currentCompanyID),
          timestamp: formatRelativeTimeID(eventTimeRaw),
          gate: gateValue || item.gatePosition,
          eventTime: formatDateTimeID(eventTimeRaw),
          vehiclePhotoUrl: item.photos?.[0]?.photoUrl || item.photoUrl,
          vehiclePhotos: item.photos || [],
          vehiclePlate: item.vehiclePlate,
        };
      });
  }, [historyItems, fallbackCompanyId, companyDirectory, user?.company]);

  const overstayVehicles = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.isOverstay)
        .sort((a, b) => b.durationMinutes - a.durationMinutes),
    [vehicles]
  );

  const normalVehicles = useMemo(
    () =>
      vehicles
        .filter((vehicle) => !vehicle.isOverstay)
        .sort((a, b) => b.durationMinutes - a.durationMinutes),
    [vehicles]
  );

  const scopedHistoryTotals = useMemo(() => {
    let totalEntries = 0;
    let totalExits = 0;

    for (const item of historyItems) {
      const normalizedIntent = normalizeGateIntent(item.generationIntent);
      if (normalizedIntent === 'ENTRY' || (!normalizedIntent && item.entryTime && !item.exitTime)) {
        totalEntries += 1;
      } else if (normalizedIntent === 'EXIT' || (!normalizedIntent && Boolean(item.exitTime))) {
        totalExits += 1;
      }
    }

    return { totalEntries, totalExits };
  }, [historyItems]);

  const isScopedCompanyView = isManagerView || Boolean(effectiveCompanyId);

  const stats = useMemo<RegionalGateCheckStats>(() => {
    const totalEntries = isScopedCompanyView
      ? scopedHistoryTotals.totalEntries
      : isDateFilterActive
        ? (historySummary?.totalEntries ?? statsSummary?.todayEntries ?? 0)
        : (statsSummary?.todayEntries ?? historySummary?.totalEntries ?? 0);

    const totalExits = isScopedCompanyView
      ? scopedHistoryTotals.totalExits
      : isDateFilterActive
        ? (historySummary?.totalExits ?? statsSummary?.todayExits ?? 0)
        : (statsSummary?.todayExits ?? historySummary?.totalExits ?? 0);

    return {
      totalActivities: totalEntries + totalExits,
      totalEntries,
      totalExits,
      vehiclesInside: vehicles.length,
      overstayCount: overstayVehicles.length,
      companiesActive: totalAssignedCompanies,
    };
  }, [
    effectiveCompanyId,
    historySummary,
    isDateFilterActive,
    isManagerView,
    isScopedCompanyView,
    overstayVehicles.length,
    scopedHistoryTotals.totalEntries,
    scopedHistoryTotals.totalExits,
    statsSummary,
    totalAssignedCompanies,
    vehicles.length,
  ]);

  const companies = useMemo<CompanyGateCheckMetrics[]>(() => {
    const metrics = new Map<string, CompanyGateCheckMetrics>();
    const hasPerCompanyData =
      historyItems.some((item) => Boolean(item.companyId)) ||
      vehicles.some((vehicle) => Boolean(vehicle.companyId));
    const resolveCompanyName = (companyID: string) =>
      companyDirectory.get(companyID) || user?.company || 'Perusahaan';

    const ensureMetric = (companyID: string): CompanyGateCheckMetrics => {
      const existing = metrics.get(companyID);
      if (existing) return existing;

      const initial: CompanyGateCheckMetrics = {
        companyId: companyID,
        companyName: resolveCompanyName(companyID),
        todayEntries: 0,
        todayExits: 0,
        vehiclesInside: 0,
        overstayCount: 0,
        performanceScore: 0,
        trend: 'stable',
      };
      metrics.set(companyID, initial);
      return initial;
    };

    if (hasPerCompanyData) {
      for (const companyID of assignedCompanyIds) {
        if (companyID) ensureMetric(companyID);
      }
    }
    if (metrics.size === 0) {
      ensureMetric(fallbackCompanyId);
    }

    for (const item of historyItems) {
      const companyID = item.companyId || fallbackCompanyId;
      const metric = ensureMetric(companyID);

      if (item.generationIntent === 'ENTRY') {
        metric.todayEntries += 1;
      } else if (item.generationIntent === 'EXIT') {
        metric.todayExits += 1;
      }
    }

    for (const vehicle of vehicles) {
      const companyID = vehicle.companyId || fallbackCompanyId;
      const metric = ensureMetric(companyID);
      metric.vehiclesInside += 1;
      if (vehicle.isOverstay) metric.overstayCount += 1;
    }

    for (const metric of metrics.values()) {
      const completionRatio = metric.todayEntries > 0
        ? (metric.todayExits / metric.todayEntries) * 100
        : 100;
      const penalty = Math.min(40, metric.overstayCount * 5);
      metric.performanceScore = clamp(Math.round(completionRatio - penalty));

      if (metric.todayEntries > metric.todayExits) {
        metric.trend = 'up';
      } else if (metric.todayEntries < metric.todayExits) {
        metric.trend = 'down';
      } else {
        metric.trend = 'stable';
      }
    }

    return Array.from(metrics.values()).sort((a, b) => {
      const aTotal = a.todayEntries + a.todayExits + a.vehiclesInside;
      const bTotal = b.todayEntries + b.todayExits + b.vehiclesInside;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return a.companyName.localeCompare(b.companyName);
    });
  }, [historyItems, vehicles, assignedCompanyIds, fallbackCompanyId, companyDirectory, user?.company]);

  const resetDateRange = () => {
    const currentMonthRange = getCurrentMonthDateRange();
    setDateFrom(currentMonthRange.from);
    setDateTo(currentMonthRange.to);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'VEHICLE_ENTRY': return <LogIn className="h-4 w-4 text-green-500" />;
      case 'VEHICLE_EXIT': return <LogOut className="h-4 w-4 text-blue-500" />;
      case 'OVERSTAY_ALERT': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCompanyStatus = (company: CompanyGateCheckMetrics): 'excellent' | 'good' | 'warning' | 'critical' => {
    const overstayRatio = company.vehiclesInside > 0
      ? company.overstayCount / company.vehiclesInside
      : 0;

    if (company.overstayCount >= 3 || overstayRatio > 0.3 || company.performanceScore < 65) {
      return 'critical';
    }

    if (company.overstayCount >= 1 || overstayRatio > 0.12 || company.performanceScore < 80) {
      return 'warning';
    }

    if (company.performanceScore >= 90) {
      return 'excellent';
    }

    return 'good';
  };

  const performanceDistribution = useMemo(() => {
    const byStatus = {
      excellent: 0,
      good: 0,
      warning: 0,
      critical: 0,
    };

    for (const company of companies) {
      byStatus[getCompanyStatus(company)] += 1;
    }

    return [
      { name: 'Excellent', value: byStatus.excellent, color: '#22c55e' },
      { name: 'Good', value: byStatus.good, color: '#3b82f6' },
      { name: 'Warning', value: byStatus.warning, color: '#eab308' },
      { name: 'Critical', value: byStatus.critical, color: '#ef4444' },
    ];
  }, [companies]);

  const hasTrendData = useMemo(
    () => trendData.some((item) => item.entries > 0 || item.exits > 0 || item.overstays > 0),
    [trendData]
  );

  const LayoutComponent = isManagerView ? ManagerDashboardLayout : AreaManagerDashboardLayout;
  const scopeTitle = isManagerView ? 'Estate Gate Check' : 'Regional Gate Check';
  const scopeDescription = isManagerView
    ? 'Monitoring gate check estate secara real-time'
    : 'Monitoring gate check lintas perusahaan';
  const activeScopeTitle = isManagerView ? 'Estate Aktif' : 'Perusahaan Aktif';
  const activeScopeText = isManagerView
    ? `${companies.length} estate terpantau`
    : `${companies.length} perusahaan terpantau`;
  const comparisonTitle = isManagerView ? 'Perbandingan Estate' : 'Perbandingan Perusahaan';
  const comparisonDescription = isManagerView
    ? 'Metrik gate check per estate hari ini'
    : 'Metrik gate check per perusahaan hari ini';
  const comparisonColumnLabel = isManagerView ? 'Estate' : 'Perusahaan';
  const performanceLabel = isManagerView ? 'Status estate berdasarkan performa' : 'Status perusahaan berdasarkan performa';

  return (
    <LayoutComponent
      title={scopeTitle}
      description={scopeDescription}
      breadcrumbItems={[{ label: 'Gate Check' }]}
    >
      <div className="space-y-6">
        {hasError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 text-sm text-red-700">
              Gagal memuat sebagian data gate check. Coba klik Refresh.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filter Range Tanggal</CardTitle>
            <CardDescription>Default: awal bulan sampai akhir bulan berjalan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDateRange}
              >
                Reset
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {(dateFrom || dateTo)
                ? `Menampilkan data dari ${dateFrom || 'awal'} sampai ${dateTo || 'akhir'}.`
                : 'Menampilkan data default bulan berjalan.'}
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Aktivitas</CardTitle>
              <Globe className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivities}</div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">+ {stats.totalEntries} masuk</span>
                <span className="text-blue-600">- {stats.totalExits} keluar</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Kendaraan di Dalam</CardTitle>
              <Truck className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vehiclesInside}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">{stats.overstayCount} Overstay</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{activeScopeTitle}</CardTitle>
              <Building className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.companiesActive}</div>
              <p className="text-sm text-gray-500 mt-2">{activeScopeText}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Alert</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.overstayCount}</div>
              <p className="text-sm text-gray-500 mt-2">Peringatan overstay aktif</p>
            </CardContent>
          </Card>
        </div>

        {/* Company Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>{comparisonTitle}</CardTitle>
            <CardDescription>{comparisonDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table">
              <TabsList className="mb-4">
                <TabsTrigger value="table">Tabel</TabsTrigger>
                <TabsTrigger value="chart">Grafik</TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">{comparisonColumnLabel}</th>
                        <th className="text-center py-3 px-2">Masuk</th>
                        <th className="text-center py-3 px-2">Keluar</th>
                        <th className="text-center py-3 px-2">Di Dalam</th>
                        <th className="text-center py-3 px-2">Overstay</th>
                        <th className="text-center py-3 px-2">Skor</th>
                        <th className="text-center py-3 px-2">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.companyId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{company.companyName}</td>
                          <td className="text-center py-3 px-2 text-green-600">{company.todayEntries}</td>
                          <td className="text-center py-3 px-2 text-blue-600">{company.todayExits}</td>
                          <td className="text-center py-3 px-2">{company.vehiclesInside}</td>
                          <td className="text-center py-3 px-2">
                            {company.overstayCount > 0 ? (
                              <Badge variant="destructive" className="text-xs">{company.overstayCount}</Badge>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={company.performanceScore >= 90 ? 'default' : company.performanceScore >= 80 ? 'secondary' : 'outline'}>
                              {company.performanceScore}%
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-2">{getTrendIcon(company.trend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="chart">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companies} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="companyName" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="todayEntries" name="Masuk" fill="#22c55e" />
                      <Bar dataKey="todayExits" name="Keluar" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Main Content: Overstay Priority + Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overstay Priority */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Prioritas Overstay Aktif</CardTitle>
              <CardDescription>Daftar kendaraan yang perlu ditindaklanjuti sekarang</CardDescription>
            </CardHeader>
            <CardContent>
              {overstayVehicles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Tidak ada overstay aktif pada rentang tanggal ini.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {overstayVehicles.slice(0, 12).map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <VehiclePhotoPreview
                          primaryPhotoUrl={vehicle.vehiclePhotoUrl}
                          photos={vehicle.vehiclePhotos}
                          vehiclePlate={vehicle.vehiclePlate}
                          borderClassName="border-orange-200"
                          fallbackClassName="bg-orange-50 text-orange-400"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono font-medium">{vehicle.vehiclePlate}</span>
                            <Badge variant="destructive" className="text-xs">Overstay</Badge>
                          </div>
                          <div className="truncate text-sm text-gray-600">{vehicle.driverName} - {vehicle.vehicleType}</div>
                          <div className="truncate text-xs text-gray-500">{vehicle.companyName}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Gate: {vehicle.entryGate || '-'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Waktu: {formatDateTimeID(vehicle.entryTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-700">{formatDurationID(vehicle.durationMinutes)}</div>
                        <div className="text-xs text-gray-500">durasi di dalam</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Performa</CardTitle>
              <CardDescription>{performanceLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {performanceDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Vehicles + Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Normal Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Kendaraan Aktif Normal
              </CardTitle>
              <CardDescription>Kendaraan di dalam area perusahaan yang belum overstay</CardDescription>
            </CardHeader>
            <CardContent>
              {normalVehicles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Tidak ada kendaraan normal aktif pada rentang tanggal ini.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {normalVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <VehiclePhotoPreview
                          primaryPhotoUrl={vehicle.vehiclePhotoUrl}
                          photos={vehicle.vehiclePhotos}
                          vehiclePlate={vehicle.vehiclePlate}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono font-medium">{vehicle.vehiclePlate}</span>
                          </div>
                          <div className="truncate text-sm text-gray-500">{vehicle.driverName} - {vehicle.vehicleType}</div>
                          <div className="truncate text-xs text-gray-400">{vehicle.companyName}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Gate: {vehicle.entryGate || '-'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Waktu: {formatDateTimeID(vehicle.entryTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-700">
                          {formatDurationID(vehicle.durationMinutes)}
                        </div>
                        <div className="text-xs text-gray-400">durasi</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regional Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktivitas Terkini
              </CardTitle>
              <CardDescription>Aktivitas gate check dari seluruh perusahaan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <VehiclePhotoPreview
                      primaryPhotoUrl={activity.vehiclePhotoUrl}
                      photos={activity.vehiclePhotos}
                      vehiclePlate={activity.vehiclePlate}
                      sizeClassName="h-12 w-12"
                    />
                    <div className="mt-1">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-gray-600">{activity.description}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Gate: {activity.gate || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waktu: {activity.eventTime || '-'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {activity.companyName} - {activity.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Trend 7 Hari Terakhir</CardTitle>
            <CardDescription>Aktivitas gate check mingguan di seluruh region</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="entries" name="Masuk" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="exits" name="Keluar" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="overstays" name="Overstay" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Belum ada aktivitas gate check pada 7 hari terakhir.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutComponent>
  );
};

const ManagerGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => (
  <AreaManagerGateCheckPage user={user} locale={locale} />
);

const AsistenGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Gate Check Monitoring</h1>
    <p>Assistant gate check page - Coming soon</p>
  </div>
);

const MandorGateCheckPage = ({ user, locale }: { user?: any; locale: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Field Gate Check</h1>
    <p>Mandor gate check page - Coming soon</p>
  </div>
);

export const GATE_CHECK_PAGE_COMPONENTS: Partial<Record<UserRole, React.LazyExoticComponent<ComponentType<PageComponentProps>>>> = {
  'SUPER_ADMIN': lazy(() => Promise.resolve({ default: SuperAdminGateCheckPage })),
  'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: CompanyAdminGateCheckPage })),
  'AREA_MANAGER': lazy(() => Promise.resolve({ default: AreaManagerGateCheckPage })),
  'MANAGER': lazy(() => Promise.resolve({ default: ManagerGateCheckPage })),
  'ASISTEN': lazy(() => Promise.resolve({ default: AsistenGateCheckPage })),
  'MANDOR': lazy(() => Promise.resolve({ default: MandorGateCheckPage })),
  'SATPAM': lazy(() => import('@/features/satpam-dashboard/components/SatpamGateCheckPage')),
};

// Complete page adapter mapping
export const PAGE_ADAPTERS = {
  dashboard: {
    components: {}, // Handled by DashboardAdapter
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Dashboard</h2><p>Welcome to your dashboard</p></div> })),
  },
  users: {
    components: USERS_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access user management.</p></div> })),
  },
  employees: {
    components: EMPLOYEES_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access employees.</p></div> })),
  },
  reports: {
    components: REPORTS_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access reports.</p></div> })),
  },
  settings: {
    components: SETTINGS_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access settings.</p></div> })),
  },
  companies: {
    components: COMPANIES_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access companies.</p></div> })),
  },
  estates: {
    components: ESTATES_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access estates.</p></div> })),
  },
  divisions: {
    components: DIVISIONS_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access divisions.</p></div> })),
  },
  blocks: {
    components: BLOCKS_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access blocks.</p></div> })),
  },
  'tarif-blok': {
    components: TARIF_BLOK_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access tarif blok.</p></div> })),
  },
  harvest: {
    components: HARVEST_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access harvest data.</p></div> })),
  },
  'gate-check': {
    components: GATE_CHECK_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access gate check.</p></div> })),
  },
  vehicles: {
    components: VEHICLES_PAGE_COMPONENTS,
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access vehicle management.</p></div> })),
  },
  notifications: {
    components: {
      'SUPER_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>System Notifications</h2><p>System-wide notification management</p></div> })),
      'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>Company Notifications</h2><p>Company-level notifications</p></div> })),
      'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Regional Notifications</h2><p>Regional notifications</p></div> })),
      'MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Estate Notifications</h2><p>Estate-level notifications</p></div> })),
      'ASISTEN': lazy(() => Promise.resolve({ default: () => <div><h2>Division Notifications</h2><p>Division notifications</p></div> })),
      'MANDOR': lazy(() => Promise.resolve({ default: () => <div><h2>Field Notifications</h2><p>Field team notifications</p></div> })),
      'SATPAM': lazy(() => Promise.resolve({ default: () => <div><h2>Security Notifications</h2><p>Security notifications</p></div> })),
      'TIMBANGAN': lazy(() => Promise.resolve({ default: () => <div><h2>Weighing Notifications</h2><p>Weighing notifications</p></div> })),
      'GRADING': lazy(() => Promise.resolve({ default: () => <div><h2>Grading Notifications</h2><p>Quality inspection notifications</p></div> })),
    },
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access notifications.</p></div> })),
  },
  assignments: {
    components: {
      'SUPER_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>System Assignments</h2><p>System-wide user assignments</p></div> })),
      'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>Company Assignments</h2><p>Company user assignments</p></div> })),
      'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Regional Assignments</h2><p>Regional assignments</p></div> })),
      'MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Estate Assignments</h2><p>Estate staff assignments</p></div> })),
      'ASISTEN': lazy(() => Promise.resolve({ default: () => <div><h2>Division Assignments</h2><p>Division assignments</p></div> })),
      'MANDOR': lazy(() => Promise.resolve({ default: () => <div><h2>Field Assignments</h2><p>Worker assignments</p></div> })),
      'SATPAM': lazy(() => Promise.resolve({ default: () => <div><h2>Security Assignments</h2><p>Security assignments</p></div> })),
      'TIMBANGAN': lazy(() => Promise.resolve({ default: () => <div><h2>Weighing Assignments</h2><p>Weighing station assignments</p></div> })),
      'GRADING': lazy(() => Promise.resolve({ default: () => <div><h2>Grading Assignments</h2><p>Quality inspection assignments</p></div> })),
    },
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access assignments.</p></div> })),
  },
  history: {
    components: {
      'SUPER_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>System History</h2><p>System-wide activity history</p></div> })),
      'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>Company History</h2><p>Company activity history</p></div> })),
      'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Regional History</h2><p>Regional activity history</p></div> })),
      'MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Estate History</h2><p>Estate activity history</p></div> })),
      'ASISTEN': lazy(() => Promise.resolve({ default: () => <div><h2>Division History</h2><p>Division activity history</p></div> })),
      'MANDOR': lazy(() => Promise.resolve({ default: () => <div><h2>Field History</h2><p>Field activity history</p></div> })),
      'SATPAM': lazy(() => Promise.resolve({ default: () => <div><h2>Security History</h2><p>Security activity history</p></div> })),
      'TIMBANGAN': lazy(() => Promise.resolve({ default: () => <div><h2>Weighing History</h2><p>Weighing activity history</p></div> })),
      'GRADING': lazy(() => Promise.resolve({ default: () => <div><h2>Grading History</h2><p>Quality inspection history</p></div> })),
    },
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>Access Denied</h2><p>You don't have permission to access history.</p></div> })),
  },
  profile: {
    components: {
      'SUPER_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>Admin Profile</h2><p>System administrator profile</p></div> })),
      'COMPANY_ADMIN': lazy(() => Promise.resolve({ default: () => <div><h2>Company Admin Profile</h2><p>Company administrator profile</p></div> })),
      'AREA_MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Regional Manager Profile</h2><p>Regional manager profile</p></div> })),
      'MANAGER': lazy(() => Promise.resolve({ default: () => <div><h2>Manager Profile</h2><p>Estate manager profile</p></div> })),
      'ASISTEN': lazy(() => Promise.resolve({ default: () => <div><h2>Assistant Profile</h2><p>Field assistant profile</p></div> })),
      'MANDOR': lazy(() => Promise.resolve({ default: () => <div><h2>Field Supervisor Profile</h2><p>Field supervisor profile</p></div> })),
      'SATPAM': lazy(() => Promise.resolve({ default: () => <div><h2>Security Profile</h2><p>Security officer profile</p></div> })),
      'TIMBANGAN': lazy(() => Promise.resolve({ default: () => <div><h2>Weighing Profile</h2><p>Weighing operator profile</p></div> })),
      'GRADING': lazy(() => Promise.resolve({ default: () => <div><h2>Grading Profile</h2><p>Quality inspector profile</p></div> })),
    },
    fallback: lazy(() => Promise.resolve({ default: () => <div><h2>User Profile</h2><p>Default user profile</p></div> })),
  },
};

// Helper function to get page component for role and page type
export function getPageComponent(pageType: string, role: UserRole): React.LazyExoticComponent<ComponentType<PageComponentProps>> | null {
  const pageAdapter = PAGE_ADAPTERS[pageType as keyof typeof PAGE_ADAPTERS];
  if (!pageAdapter) {
    return null;
  }

  return pageAdapter.components[role] || pageAdapter.fallback || null;
}

// Helper function to check if role can access specific page type
export function canRoleAccessPage(pageType: string, role: UserRole): boolean {
  const pageAdapter = PAGE_ADAPTERS[pageType as keyof typeof PAGE_ADAPTERS];
  if (!pageAdapter) {
    return false;
  }

  return !!pageAdapter.components[role];
}









