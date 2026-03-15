'use client';

import { Eye, Plus, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeCampaignHeaderProps {
  onCreate: () => void;
  onPreviewActive: () => void;
  onOpenKillSwitchConfirm: () => void;
}

export function ThemeCampaignHeader({
  onCreate,
  onPreviewActive,
  onOpenKillSwitchConfirm,
}: ThemeCampaignHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-subtle-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Manajemen Theme Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Panel kontrol internal untuk aktivasi runtime tema musiman global dan rollback.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCreate} className="min-w-40">
            <Plus className="mr-2 h-4 w-4" />
            Buat Kampanye
          </Button>
          <Button variant="outline" onClick={onPreviewActive}>
            <Eye className="mr-2 h-4 w-4" />
            Pratinjau Tema Aktif
          </Button>
          <Button variant="destructive" onClick={onOpenKillSwitchConfirm}>
            <Siren className="mr-2 h-4 w-4" />
            Global Kill Switch
          </Button>
        </div>
      </div>
    </div>
  );
}
