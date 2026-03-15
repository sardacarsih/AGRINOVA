'use client';

import { Monitor, Moon, Smartphone, Sun } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ThemeCampaign,
  ThemeEntity,
  ThemePlatform,
  ThemePlatformAssets,
} from '@/features/theme-campaigns/types/theme-campaign';

interface ThemePreviewDialogProps {
  open: boolean;
  campaign: ThemeCampaign | null;
  theme: ThemeEntity | null;
  onOpenChange: (open: boolean) => void;
}

const modeClasses = {
  light: 'bg-slate-50 text-slate-900',
  dark: 'bg-slate-900 text-slate-100',
};

export function ThemePreviewDialog({ open, campaign, theme, onOpenChange }: ThemePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panel Pratinjau Tema</DialogTitle>
          <DialogDescription>
            {campaign
              ? `Menampilkan pratinjau "${campaign.campaign_name}" (${theme?.name ?? 'Tema Tidak Dikenal'})`
              : 'Belum ada kampanye aktif yang dipilih. Pilih kampanye dari tabel atau pratinjau tema aktif.'}
          </DialogDescription>
        </DialogHeader>

        {!campaign ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Belum ada kampanye yang dipilih untuk pratinjau.
          </div>
        ) : (
          <Tabs defaultValue="light" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light">
                <Sun className="mr-2 h-4 w-4" />
                Mode Terang
              </TabsTrigger>
              <TabsTrigger value="dark">
                <Moon className="mr-2 h-4 w-4" />
                Mode Gelap
              </TabsTrigger>
            </TabsList>

            {(['light', 'dark'] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-4">
                <Tabs defaultValue="desktop" className="space-y-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="desktop">
                      <Monitor className="mr-2 h-4 w-4" />
                      Web
                    </TabsTrigger>
                    <TabsTrigger value="mobile">
                      <Smartphone className="mr-2 h-4 w-4" />
                      Mobile
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="desktop">
                    <PreviewSurface
                      mode={mode}
                      title="Runtime Web"
                      subtitle="Aset visual untuk platform web"
                      campaign={campaign}
                      platform="web"
                      assets={campaign.assets.web}
                      compact={false}
                    />
                  </TabsContent>

                  <TabsContent value="mobile">
                    <div className="mx-auto max-w-sm">
                      <PreviewSurface
                        mode={mode}
                        title="Runtime Mobile"
                        subtitle="Aset visual untuk platform mobile"
                        campaign={campaign}
                        platform="mobile"
                        assets={campaign.assets.mobile}
                        compact={true}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PreviewSurfaceProps {
  mode: 'light' | 'dark';
  title: string;
  subtitle: string;
  campaign: ThemeCampaign;
  platform: ThemePlatform;
  assets: ThemePlatformAssets;
  compact: boolean;
}

function PreviewSurface({
  mode,
  title,
  subtitle,
  campaign,
  platform,
  assets,
  compact,
}: PreviewSurfaceProps) {
  const accentClass =
    assets.accentAsset === 'diamond-grid' ? 'border-dashed' : 'border-solid';

  return (
    <div className={`overflow-hidden rounded-2xl border ${modeClasses[mode]}`}>
      <div
        className={`relative space-y-4 p-5 ${compact ? 'min-h-[360px]' : 'min-h-[280px]'}`}
        style={{
          backgroundImage: assets.backgroundImage
            ? `linear-gradient(to bottom right, rgba(15,23,42,0.35), rgba(15,23,42,0.1)), url(${assets.backgroundImage})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{title}</Badge>
          <Badge variant="secondary">{assets.iconPack || '-'}</Badge>
          <Badge variant="outline">aksen: {assets.accentAsset || '-'}</Badge>
          <Badge variant="outline">platform: {platform}</Badge>
        </div>

        <div className={`rounded-xl border bg-background/80 p-4 shadow-sm backdrop-blur-sm ${accentClass}`}>
          <h4 className="text-base font-semibold">{campaign.campaign_name}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3 text-xs">
              <p className="font-medium">Aksen Brand</p>
              <div className="mt-2 h-2 rounded-full bg-primary" />
            </div>
            <div className="rounded-lg border bg-card p-3 text-xs">
              <p className="font-medium">Gaya Ikon</p>
              <div className="mt-2 flex gap-1">
                <div className="h-4 w-4 rounded bg-primary/80" />
                <div className="h-4 w-4 rounded bg-primary/60" />
                <div className="h-4 w-4 rounded bg-primary/40" />
              </div>
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="rounded-xl border bg-background/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">Tampilan Kartu Login</p>
            <div className="mt-2 space-y-2">
              <div className="h-2 rounded bg-muted" />
              <div className="h-2 rounded bg-muted/80" />
              <div className="h-8 rounded bg-primary" />
            </div>
          </div>

          <div className="rounded-xl border bg-background/85 p-3 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Ilustrasi Hero</p>
            {assets.illustration ? (
              <img
                src={assets.illustration}
                alt={`${platform} illustration preview`}
                className="h-24 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                Tidak ada aset ilustrasi
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
