'use client';

import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeAuditLog } from '@/features/theme-campaigns/types/theme-campaign';

interface ThemeAuditLogTimelineProps {
  logs: ThemeAuditLog[];
}

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function ThemeAuditLogTimeline({ logs }: ThemeAuditLogTimelineProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Linimasa Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada aktivitas audit.
          </div>
        ) : (
          <ScrollArea className="h-[340px] pr-3">
            <ol className="relative border-l pl-4">
              {logs.map((log) => (
                <li key={log.id} className="mb-6 ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-primary bg-primary" />
                  <div className="rounded-xl border bg-card p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium">
                        {log.actor} <span className="text-muted-foreground">melakukan {log.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</p>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">Target:</span> {log.target_entity}
                    </p>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="rounded-md border bg-muted/30 p-2">
                        <p className="font-medium text-foreground">Sebelum</p>
                        <p>{log.before_summary}</p>
                      </div>
                      <div className="rounded-md border bg-muted/30 p-2">
                        <p className="font-medium text-foreground">Sesudah</p>
                        <p>{log.after_summary}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
