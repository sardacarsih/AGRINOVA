'use client';

import { CalendarClock, Layers3, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeCampaignStats } from '@/features/theme-campaigns/types/theme-campaign';

interface ThemeCampaignSummaryCardsProps {
  stats: ThemeCampaignStats;
}

export function ThemeCampaignSummaryCards({ stats }: ThemeCampaignSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Total Kampanye
            <Layers3 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Kampanye Aktif
            <Sparkles className="h-4 w-4 text-status-success" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.active}</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Kampanye Terjadwal
            <CalendarClock className="h-4 w-4 text-status-info" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.scheduled}</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Status Kill Switch
            <ShieldAlert className="h-4 w-4 text-status-error" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant={stats.killSwitchEnabled ? 'destructive' : 'success'}>
            {stats.killSwitchEnabled ? 'AKTIF' : 'NORMAL'}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {stats.killSwitchEnabled
              ? 'Semua kampanye musiman sedang dibypass.'
              : 'Resolver kampanye musiman aktif.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
