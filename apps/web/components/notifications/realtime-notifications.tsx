'use client';

import { useEffect, useState } from 'react';
import { useHarvestSubscriptions, useSatpamSubscriptions } from '@/hooks/use-graphql-subscriptions';
import { useAuth } from '@/hooks/use-auth';
import { HarvestRecord } from '@/lib/apollo/queries/harvest';
import { SatpamGuestLog, VehicleInsideInfo } from '@/lib/apollo/queries/gate-check';
import { useNotifications } from '@/lib/notifications/notification-provider';

// Simple WebSocket status hook - provides default connection status
function useWebSocketStatus() {
  const [isConnected] = useState(true);
  const [connectionError] = useState<string | null>(null);
  const [reconnectAttempts] = useState(0);

  return { isConnected, connectionError, reconnectAttempts };
}

interface RealtimeNotificationsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  theme?: 'light' | 'dark' | 'system';
}

const HARVEST_SUBSCRIPTION_ALLOWED_ROLES = new Set([
  'MANDOR',
  'ASISTEN',
  'MANAGER',
  'AREA_MANAGER',
  'COMPANY_ADMIN',
  'SUPER_ADMIN',
]);

const SATPAM_SUBSCRIPTION_ALLOWED_ROLES = new Set([
  'SATPAM',
  'MANAGER',
  'AREA_MANAGER',
]);

const normalizeRoleName = (role?: string | null): string => {
  if (!role) return '';

  const normalized = role
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^ROLE_+/, '');

  if (normalized === 'AREA_AMANAGER' || normalized === 'AREAMANAGER') {
    return 'AREA_MANAGER';
  }

  return normalized;
};

/**
 * Real-time notification system that listens to GraphQL subscriptions
 * and displays role-based notifications for all supported roles.
 */
export function RealtimeNotifications({
  position = 'top-right',
  theme = 'system',
}: RealtimeNotificationsProps) {
  void position;
  void theme;

  const { user, isAuthenticated } = useAuth();
  const { refreshNotifications, showInfo, showSuccess, showWarning, showError } = useNotifications();
  const { isConnected, connectionError, reconnectAttempts } = useWebSocketStatus();
  const normalizedRole = normalizeRoleName(user?.role);

  const shouldEnableSubscriptions =
    isAuthenticated &&
    !!user &&
    !!normalizedRole &&
    HARVEST_SUBSCRIPTION_ALLOWED_ROLES.has(normalizedRole);

  const shouldEnableSatpamSubscriptions =
    isAuthenticated &&
    !!user &&
    !!normalizedRole &&
    SATPAM_SUBSCRIPTION_ALLOWED_ROLES.has(normalizedRole);

  const getHarvestValue = (record: HarvestRecord) => record.beratTbs * 2500;

  useHarvestSubscriptions(shouldEnableSubscriptions ? {
    onCreated: (record: HarvestRecord) => {
      if (!normalizedRole) return;
      if (normalizedRole === 'MANDOR' && record.mandorId !== user?.id) return;

      const baseMessage = `${record.mandor.name} submit panen ${record.block.name} (${record.beratTbs} kg)`;

      switch (normalizedRole) {
        case 'SUPER_ADMIN':
          if (record.beratTbs > 2500) {
            showWarning('Monitoring Sistem Panen', `${baseMessage}. Volume sangat tinggi, perlu pemantauan lintas perusahaan.`);
          } else {
            showInfo('Update Sistem Panen', `${baseMessage}.`);
          }
          break;

        case 'COMPANY_ADMIN':
          if (record.beratTbs > 1500) {
            showWarning('Alert Produksi Perusahaan', `${baseMessage}. Volume besar terdeteksi.`);
          } else {
            showInfo('Update Produksi Perusahaan', `${baseMessage}.`);
          }
          break;

        case 'AREA_MANAGER':
          if (record.beratTbs > 2000) {
            showWarning('Alert Produksi Area', `${baseMessage}. Perlu oversight area.`);
          } else {
            showInfo('Update Produksi Area', `${baseMessage}.`);
          }
          break;

        case 'MANAGER':
          if (record.beratTbs > 1000) {
            showWarning('Panen Volume Tinggi', `${baseMessage}.`);
          } else {
            showInfo('Update Produksi Estate', `${baseMessage}.`);
          }
          break;

        case 'ASISTEN':
          showWarning('Persetujuan Panen Diperlukan', `${baseMessage}. Mohon review approval.`);
          break;

        case 'MANDOR':
          showSuccess('Panen Berhasil Dikirim', `Data ${record.block.name} (${record.beratTbs} kg) menunggu persetujuan.`);
          break;

        case 'TIMBANGAN':
          showInfo('Antrean Timbangan', `${baseMessage}. Siapkan proses timbang.`);
          break;

        case 'GRADING':
          showInfo('Persiapan Grading', `${baseMessage}. Siapkan quality check.`);
          break;
      }
    },

    onApproved: (record: HarvestRecord) => {
      if (!normalizedRole) return;
      if (normalizedRole === 'MANDOR' && record.mandorId !== user?.id) return;

      const harvestValue = getHarvestValue(record);
      const amountText = `Rp ${harvestValue.toLocaleString('id-ID')}`;
      const baseMessage = `Panen ${record.block.name} (${record.beratTbs} kg, ${amountText}) disetujui.`;

      switch (normalizedRole) {
        case 'SUPER_ADMIN':
          if (harvestValue >= 10000000) {
            showWarning('High Value Approval', baseMessage);
          } else {
            showInfo('Approval Tercatat', baseMessage);
          }
          break;

        case 'COMPANY_ADMIN':
          showInfo('Approval Produksi', baseMessage);
          break;

        case 'AREA_MANAGER':
          showInfo('Approval Estate', baseMessage);
          break;

        case 'MANAGER':
          if (harvestValue >= 5000000) {
            showWarning('Approval Nilai Tinggi', baseMessage);
          } else {
            showSuccess('Approval Panen', baseMessage);
          }
          break;

        case 'ASISTEN':
          showSuccess('Approval Berhasil', baseMessage);
          break;

        case 'MANDOR':
          showSuccess('Panen Disetujui', `Data Anda untuk ${record.block.name} telah disetujui.`);
          break;

        case 'TIMBANGAN':
          showSuccess('Siap Proses Timbang', baseMessage);
          break;

        case 'GRADING':
          showInfo('Siap Proses Grading', baseMessage);
          break;
      }
    },

    onRejected: (record: HarvestRecord) => {
      if (!normalizedRole) return;
      if (normalizedRole === 'MANDOR' && record.mandorId !== user?.id) return;

      const reason = record.rejectedReason || 'Alasan tidak tersedia';
      const baseMessage = `Panen ${record.block.name} (${record.beratTbs} kg) ditolak. Alasan: ${reason}`;

      switch (normalizedRole) {
        case 'SUPER_ADMIN':
        case 'COMPANY_ADMIN':
        case 'AREA_MANAGER':
        case 'MANAGER':
          showWarning('Reject Panen', baseMessage);
          break;

        case 'ASISTEN':
          showWarning('Data Ditolak', baseMessage);
          break;

        case 'MANDOR':
          showError('Panen Ditolak', `Data Anda untuk ${record.block.name} ditolak. ${reason}`);
          break;

        case 'TIMBANGAN':
        case 'GRADING':
          showWarning('Update QC Panen', baseMessage);
          break;
      }
    },
  } : {});

  useSatpamSubscriptions(shouldEnableSatpamSubscriptions ? {
    onVehicleEntry: (_record: SatpamGuestLog) => {
      // Vehicle entry notifications are persisted on backend; refresh inbox from DB.
      refreshNotifications();
    },
    onVehicleExit: (_record: SatpamGuestLog) => {
      // Vehicle exit notifications are persisted on backend; refresh inbox from DB.
      refreshNotifications();
    },
    onOverstayAlert: (_record: VehicleInsideInfo) => {
      // Overstay notifications are persisted on backend; refresh inbox from DB.
      refreshNotifications();
    },
  } : {});

  useEffect(() => {
    if (shouldEnableSubscriptions && connectionError && reconnectAttempts > 0) {
      showError(
        'Real-time Connection Lost',
        `Unable to connect to real-time notifications. Reconnect attempts: ${reconnectAttempts}. Check your connection.`
      );
    }
  }, [shouldEnableSubscriptions, connectionError, reconnectAttempts, showError]);

  useEffect(() => {
    if (shouldEnableSubscriptions && isConnected && reconnectAttempts > 0) {
      showSuccess(
        'Real-time Connection Restored',
        'Real-time notifications are now working properly.'
      );
    }
  }, [shouldEnableSubscriptions, isConnected, reconnectAttempts, showSuccess]);

  return null;
}

export default RealtimeNotifications;
