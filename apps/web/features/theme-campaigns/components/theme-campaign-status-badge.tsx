'use client';

import { Badge } from '@/components/ui/badge';
import { ThemeCampaignStatus } from '@/features/theme-campaigns/types/theme-campaign';

interface ThemeCampaignStatusBadgeProps {
  status: ThemeCampaignStatus;
}

const STATUS_LABELS: Record<ThemeCampaignStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Terjadwal',
  ACTIVE: 'Aktif',
  EXPIRED: 'Kedaluwarsa',
  DISABLED: 'Nonaktif',
};

export function ThemeCampaignStatusBadge({ status }: ThemeCampaignStatusBadgeProps) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">{STATUS_LABELS[status]}</Badge>;
    case 'SCHEDULED':
      return <Badge variant="pending">{STATUS_LABELS[status]}</Badge>;
    case 'EXPIRED':
      return <Badge variant="warning">{STATUS_LABELS[status]}</Badge>;
    case 'DISABLED':
      return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
    case 'DRAFT':
    default:
      return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
  }
}
