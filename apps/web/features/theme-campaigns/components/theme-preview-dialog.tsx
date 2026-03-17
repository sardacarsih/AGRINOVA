'use client';

import Image from 'next/image';
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
  ThemeAssetManifest,
  ThemeCampaign,
  ThemeEntity,
  ThemeMode,
  ThemeTokenConfig,
  ThemePlatform,
  ThemeAppUiSlots,
  ThemePlatformAssets,
} from '@/features/theme-campaigns/types/theme-campaign';
import { MobileAppUiRuntimePreview } from '@/features/theme-campaigns/components/mobile-app-ui-runtime-preview';

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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const APP_UI_SLOT_KEYS: Array<keyof ThemeAppUiSlots> = [
  'navbar',
  'sidebar',
  'footer',
  'dashboard',
  'notification_banner',
  'empty_state_illustration',
  'modal_accent',
];

const APP_UI_SLOT_PROPERTY_KEYS = [
  'backgroundColor',
  'foregroundColor',
  'textColor',
  'borderColor',
  'accentColor',
  'iconColor',
  'asset',
] as const;

interface ThemePreviewTokens {
  accentColor: string;
  accentSoftColor: string;
  loginCardBorder: string;
}

const resolveThemeAssetManifestMode = (
  manifest: ThemeAssetManifest | undefined,
  mode: ThemeMode
): ThemeAssetManifest => {
  if (!manifest) {
    return {
      backgroundImage: '',
      illustration: '',
      iconPack: 'outline-enterprise',
      accentAsset: 'none',
      app_ui: {},
    };
  }

  const modeVariant =
    (manifest.modes?.[mode] as ThemeAssetManifest | undefined) ||
    undefined;

  return {
    ...manifest,
    ...modeVariant,
    app_ui: {
      ...(manifest.app_ui || {}),
      ...(modeVariant?.app_ui || {}),
    },
  };
};

const resolveThemeTokenMode = (
  tokenConfig: ThemeTokenConfig | undefined,
  mode: ThemeMode
): ThemePreviewTokens => {
  const fallback: ThemePreviewTokens = {
    accentColor: '#059669',
    accentSoftColor: '#d1fae5',
    loginCardBorder: '#34d399',
  };
  if (!tokenConfig) {
    return fallback;
  }

  const modeVariant = (tokenConfig.modes?.[mode] as ThemeTokenConfig | undefined) || undefined;
  return {
    accentColor: modeVariant?.accentColor || tokenConfig.accentColor || fallback.accentColor,
    accentSoftColor:
      modeVariant?.accentSoftColor || tokenConfig.accentSoftColor || fallback.accentSoftColor,
    loginCardBorder:
      modeVariant?.loginCardBorder || tokenConfig.loginCardBorder || fallback.loginCardBorder,
  };
};

const normalizePlatformAssets = (value?: Partial<ThemePlatformAssets>): ThemePlatformAssets => ({
  backgroundImage: value?.backgroundImage || '',
  illustration: value?.illustration || '',
  iconPack: value?.iconPack || 'outline-enterprise',
  accentAsset: value?.accentAsset || 'none',
  app_ui: value?.app_ui || {},
});

const mergeAppUiSlots = (
  baseSlots: ThemeAppUiSlots | undefined,
  overrideSlots: ThemeAppUiSlots | undefined
): ThemeAppUiSlots => {
  const merged: ThemeAppUiSlots = {};

  APP_UI_SLOT_KEYS.forEach((slotKey) => {
    const baseSlot = asRecord(baseSlots?.[slotKey]);
    const overrideSlot = asRecord(overrideSlots?.[slotKey]);
    const slotResult: Record<string, string> = {};

    APP_UI_SLOT_PROPERTY_KEYS.forEach((propertyKey) => {
      const overrideValue = overrideSlot[propertyKey];
      const baseValue = baseSlot[propertyKey];
      if (typeof overrideValue === 'string' && overrideValue.trim()) {
        slotResult[propertyKey] = overrideValue.trim();
        return;
      }
      if (typeof baseValue === 'string' && baseValue.trim()) {
        slotResult[propertyKey] = baseValue.trim();
      }
    });

    merged[slotKey] = slotResult;
  });

  return merged;
};

const mergeAppUiSlotsAssetOnlyOverride = (
  baseSlots: ThemeAppUiSlots | undefined,
  overrideSlots: ThemeAppUiSlots | undefined
): ThemeAppUiSlots => {
  const merged = mergeAppUiSlots(baseSlots, undefined);

  APP_UI_SLOT_KEYS.forEach((slotKey) => {
    const slotResult = asRecord(merged[slotKey]);
    const overrideSlot = asRecord(overrideSlots?.[slotKey]);
    const overrideAsset = overrideSlot.asset;
    if (typeof overrideAsset === 'string' && overrideAsset.trim()) {
      slotResult.asset = overrideAsset.trim();
    } else if (typeof slotResult.asset !== 'string') {
      slotResult.asset = '';
    }
    merged[slotKey] = slotResult;
  });

  return merged;
};

const resolvePreviewModeAvailability = (
  campaign: ThemeCampaign | null
): Record<ThemeMode, boolean> => {
  if (!campaign) {
    return { light: true, dark: true };
  }
  const light = campaign.light_mode_enabled;
  const dark = campaign.dark_mode_enabled;
  if (!light && !dark) {
    return { light: true, dark: true };
  }
  return { light, dark };
};

const resolvePreferredPreviewMode = (availability: Record<ThemeMode, boolean>): ThemeMode =>
  availability.dark && !availability.light ? 'dark' : 'light';

const mergePreviewAssets = (
  theme: ThemeEntity | null,
  campaignAssets: ThemePlatformAssets,
  platform: ThemePlatform,
  mode: ThemeMode
): ThemePlatformAssets => {
  const manifestMode = resolveThemeAssetManifestMode(theme?.asset_manifest_json, mode);
  const modePlatformAssets = normalizePlatformAssets(
    (platform === 'web' ? manifestMode.web : manifestMode.mobile) as
      | ThemePlatformAssets
      | undefined
  );

  const base = normalizePlatformAssets({
    backgroundImage: modePlatformAssets.backgroundImage || manifestMode.backgroundImage,
    illustration: modePlatformAssets.illustration || manifestMode.illustration,
    iconPack: modePlatformAssets.iconPack || manifestMode.iconPack,
    accentAsset: modePlatformAssets.accentAsset || manifestMode.accentAsset,
    app_ui: modePlatformAssets.app_ui || manifestMode.app_ui,
  });

  const override = normalizePlatformAssets(campaignAssets);
  return {
    backgroundImage: override.backgroundImage || base.backgroundImage,
    illustration: override.illustration || base.illustration,
    iconPack: override.iconPack || base.iconPack,
    accentAsset: override.accentAsset || base.accentAsset,
    app_ui: mergeAppUiSlotsAssetOnlyOverride(base.app_ui, override.app_ui),
  };
};

export function ThemePreviewDialog({ open, campaign, theme, onOpenChange }: ThemePreviewDialogProps) {
  const modeAvailability = resolvePreviewModeAvailability(campaign);
  const preferredMode = resolvePreferredPreviewMode(modeAvailability);

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
          <Tabs defaultValue={preferredMode} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light" disabled={!modeAvailability.light}>
                <Sun className="mr-2 h-4 w-4" />
                Mode Terang
              </TabsTrigger>
              <TabsTrigger value="dark" disabled={!modeAvailability.dark}>
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
                    {(() => {
                      const assets = mergePreviewAssets(theme, campaign.assets.web, 'web', mode);
                      const tokens = resolveThemeTokenMode(theme?.token_json, mode);
                      return (
                    <PreviewSurface
                      mode={mode}
                      title="Runtime Web"
                      subtitle="Aset visual untuk platform web"
                      campaign={campaign}
                      platform="web"
                      assets={assets}
                      tokens={tokens}
                      compact={false}
                    />
                      );
                    })()}
                  </TabsContent>

                  <TabsContent value="mobile">
                    <div className="mx-auto max-w-sm">
                      {(() => {
                        const assets = mergePreviewAssets(theme, campaign.assets.mobile, 'mobile', mode);
                        const tokens = resolveThemeTokenMode(theme?.token_json, mode);
                        return (
                      <PreviewSurface
                        mode={mode}
                        title="Runtime Mobile"
                        subtitle="Aset visual untuk platform mobile"
                        campaign={campaign}
                        platform="mobile"
                        assets={assets}
                        tokens={tokens}
                        compact={true}
                      />
                        );
                      })()}
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
  tokens: ThemePreviewTokens;
  compact: boolean;
}

function PreviewSurface({
  mode,
  title,
  subtitle,
  campaign,
  platform,
  assets,
  tokens,
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

        <div
          className={`rounded-xl border bg-background/80 p-4 shadow-sm backdrop-blur-sm ${accentClass}`}
          style={{ borderColor: tokens.loginCardBorder }}
        >
          <h4 className="text-base font-semibold">{campaign.campaign_name}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3 text-xs">
              <p className="font-medium">Aksen Brand</p>
              <div
                className="mt-2 h-2 rounded-full"
                style={{ backgroundColor: tokens.accentColor }}
              />
            </div>
            <div className="rounded-lg border bg-card p-3 text-xs">
              <p className="font-medium">Gaya Ikon</p>
              <div className="mt-2 flex gap-1">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: tokens.accentColor }} />
                <div className="h-4 w-4 rounded" style={{ backgroundColor: tokens.loginCardBorder }} />
                <div className="h-4 w-4 rounded" style={{ backgroundColor: tokens.accentSoftColor }} />
              </div>
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div
            className="rounded-xl border bg-background/85 p-4 backdrop-blur-sm"
            style={{ borderColor: tokens.loginCardBorder }}
          >
            <p className="text-xs font-medium text-muted-foreground">Tampilan Kartu Login</p>
            <div className="mt-2 space-y-2">
              <div className="h-2 rounded bg-muted" />
              <div className="h-2 rounded bg-muted/80" />
              <div
                className="h-8 rounded"
                style={{
                  backgroundColor: tokens.accentSoftColor,
                  border: `1px solid ${tokens.loginCardBorder}`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-background/85 p-3 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Ilustrasi Hero</p>
            {assets.illustration ? (
              <div className="relative h-24 w-full overflow-hidden rounded-lg">
                <Image
                  src={assets.illustration}
                  alt={`${platform} illustration preview`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                Tidak ada aset ilustrasi
              </div>
            )}
          </div>
        </div>

        {platform === 'mobile' ? (
          <div className="rounded-xl border bg-background/85 p-3 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Pratinjau Slot App UI</p>
            <MobileAppUiRuntimePreview
              slots={assets.app_ui}
              compact={true}
              className="mx-auto max-w-[280px]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
