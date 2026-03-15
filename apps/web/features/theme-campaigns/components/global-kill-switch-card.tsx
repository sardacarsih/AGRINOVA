'use client';

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GlobalKillSwitchCardProps {
  enabled: boolean;
  onTrigger: () => void;
}

export function GlobalKillSwitchCard({ enabled, onTrigger }: GlobalKillSwitchCardProps) {
  return (
    <Alert
      variant={enabled ? 'destructive' : 'warning'}
      className={`rounded-2xl border-2 ${enabled ? 'border-destructive/70' : 'border-status-warning/60'}`}
    >
      {enabled ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Global Kill Switch
        <Badge variant={enabled ? 'destructive' : 'success'}>{enabled ? 'ROLLBACK AKTIF' : 'NORMAL'}</Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm">
          Kontrol rollback darurat. Jika diaktifkan, seluruh kampanye musiman akan langsung dibypass dan sistem
          memaksa penggunaan tema dasar secara global.
        </p>
        <Button variant="destructive" onClick={onTrigger}>
          {enabled ? 'Nonaktifkan Kill Switch' : 'Aktifkan Kill Switch'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
