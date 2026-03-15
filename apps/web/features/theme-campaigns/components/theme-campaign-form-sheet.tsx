'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';
import { MobileAppUiRuntimePreview } from '@/features/theme-campaigns/components/mobile-app-ui-runtime-preview';
import {
  ThemeAppUiSlot,
  ThemeAppUiSlots,
  ThemeCampaign,
  ThemeCampaignFormValues,
  ThemeEntity,
  ThemePlatform,
  ThemePlatformAssets,
} from '@/features/theme-campaigns/types/theme-campaign';

type FormMode = 'create' | 'edit';

interface ThemeCampaignFormSheetProps {
  open: boolean;
  mode: FormMode;
  campaign: ThemeCampaign | null;
  themes: ThemeEntity[];
  iconPackOptions: string[];
  accentAssetOptions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ThemeCampaignFormValues) => Promise<void> | void;
}

interface FormDraft {
  campaign_group_key: string;
  campaign_name: string;
  theme_id: string;
  description: string;
  enabled: boolean;
  priority: string;
  start_at: string;
  end_at: string;
  light_mode_enabled: boolean;
  dark_mode_enabled: boolean;
  assets: {
    web: ThemePlatformAssets;
    mobile: ThemePlatformAssets;
  };
}

type AssetFieldKey = 'backgroundImage' | 'illustration';
type PlatformAssetEditableKey = Exclude<keyof ThemePlatformAssets, 'app_ui'>;
type AppUiSlotKey = keyof ThemeAppUiSlots;
type AppUiSlotFieldKey = keyof ThemeAppUiSlot;

interface AssetFieldFeedback {
  error: string;
  warning: string;
}

const EMPTY_PLATFORM_ASSETS: ThemePlatformAssets = {
  backgroundImage: '',
  illustration: '',
  iconPack: 'outline-enterprise',
  accentAsset: 'none',
  app_ui: {},
};

const APP_UI_SLOT_CONFIG: Array<{ key: AppUiSlotKey; label: string; description: string }> = [
  { key: 'navbar', label: 'Navbar', description: 'AppBar title, icon, and navbar surface' },
  { key: 'sidebar', label: 'Sidebar', description: 'Drawer, popup menu, and side menu surface' },
  { key: 'footer', label: 'Footer', description: 'Bottom navigation background and states' },
  { key: 'dashboard', label: 'Dashboard', description: 'Dashboard background, card surface, and border' },
  {
    key: 'notification_banner',
    label: 'Notification Banner',
    description: 'Snackbar and notification banner colors',
  },
  {
    key: 'empty_state_illustration',
    label: 'Empty State Illustration',
    description: 'Illustration URL/asset for empty state',
  },
  {
    key: 'modal_accent',
    label: 'Modal Accent',
    description: 'Dialog background and action accents',
  },
];

const APP_UI_SLOT_FIELD_CONFIG: Array<{
  key: AppUiSlotFieldKey;
  label: string;
  placeholder: string;
}> = [
  { key: 'backgroundColor', label: 'backgroundColor', placeholder: '#0F172A' },
  { key: 'foregroundColor', label: 'foregroundColor', placeholder: '#FFFFFF' },
  { key: 'textColor', label: 'textColor', placeholder: '#E2E8F0' },
  { key: 'borderColor', label: 'borderColor', placeholder: '#1F2937' },
  { key: 'accentColor', label: 'accentColor', placeholder: '#34D399' },
  { key: 'iconColor', label: 'iconColor', placeholder: '#93C5FD' },
  { key: 'asset', label: 'asset', placeholder: 'https://.../asset.svg' },
];

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = '2MB';
const SVG_MIME_TYPE = 'image/svg+xml';
const IMAGE_RESIZE_SCALE_STEPS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const IMAGE_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];

const RECOMMENDED_DIMENSIONS: Record<
  ThemePlatform,
  Record<AssetFieldKey, { width: number; height: number }>
> = {
  web: {
    backgroundImage: { width: 1920, height: 1080 },
    illustration: { width: 1500, height: 600 },
  },
  mobile: {
    backgroundImage: { width: 1080, height: 2400 },
    illustration: { width: 1200, height: 480 },
  },
};

const EMPTY_ASSET_FEEDBACK: Record<
  ThemePlatform,
  Record<AssetFieldKey, AssetFieldFeedback>
> = {
  web: {
    backgroundImage: { error: '', warning: '' },
    illustration: { error: '', warning: '' },
  },
  mobile: {
    backgroundImage: { error: '', warning: '' },
    illustration: { error: '', warning: '' },
  },
};

const EMPTY_ASSET_UPLOAD_STATE: Record<ThemePlatform, Record<AssetFieldKey, boolean>> = {
  web: {
    backgroundImage: false,
    illustration: false,
  },
  mobile: {
    backgroundImage: false,
    illustration: false,
  },
};

const EMPTY_FORM: FormDraft = {
  campaign_group_key: '',
  campaign_name: '',
  theme_id: '',
  description: '',
  enabled: true,
  priority: '50',
  start_at: '',
  end_at: '',
  light_mode_enabled: true,
  dark_mode_enabled: true,
  assets: {
    web: { ...EMPTY_PLATFORM_ASSETS },
    mobile: { ...EMPTY_PLATFORM_ASSETS },
  },
};

const toLocalDateTimeValue = (isoValue?: string) => {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoValue = (localValue?: string) => {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const normalizeAppUiSlot = (slot?: ThemeAppUiSlot): ThemeAppUiSlot => ({
  backgroundColor: slot?.backgroundColor || '',
  foregroundColor: slot?.foregroundColor || '',
  textColor: slot?.textColor || '',
  borderColor: slot?.borderColor || '',
  accentColor: slot?.accentColor || '',
  iconColor: slot?.iconColor || '',
  asset: slot?.asset || '',
});

const mapAppUiSlots = (slots?: ThemeAppUiSlots): ThemeAppUiSlots =>
  APP_UI_SLOT_CONFIG.reduce<ThemeAppUiSlots>((acc, slot) => {
    acc[slot.key] = normalizeAppUiSlot(slots?.[slot.key]);
    return acc;
  }, {});

const mapPlatformAssets = (assets?: ThemePlatformAssets): ThemePlatformAssets => ({
  backgroundImage: assets?.backgroundImage || '',
  illustration: assets?.illustration || '',
  iconPack: assets?.iconPack || 'outline-enterprise',
  accentAsset: assets?.accentAsset || 'none',
  app_ui: mapAppUiSlots(assets?.app_ui),
});

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const result = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('failed to read image dimensions'));
    };

    image.src = objectUrl;
  });

const isSvgFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase();
  const lowerMime = file.type.toLowerCase();
  return lowerName.endsWith('.svg') || lowerMime === SVG_MIME_TYPE;
};

const formatFileSizeMB = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)}MB`;

const fitWithinBounds = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  if (sourceWidth <= 0 || sourceHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: sourceWidth, height: sourceHeight };
  }

  let width = sourceWidth;
  let height = sourceHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });

const optimizedFileName = (file: File, mimeType: string): string => {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  if (mimeType === 'image/webp') return `${baseName}.webp`;
  if (mimeType === 'image/jpeg') return `${baseName}.jpg`;
  return file.name;
};

const optimizeRasterImageForUpload = async (
  file: File,
  recommendation: { width: number; height: number }
): Promise<{ file: File; note?: string }> => {
  if (file.size <= MAX_UPLOAD_SIZE_BYTES || isSvgFile(file) || !file.type.startsWith('image/')) {
    return { file };
  }

  const sourceDimensions = await readImageDimensions(file);
  const target = fitWithinBounds(
    sourceDimensions.width,
    sourceDimensions.height,
    recommendation.width,
    recommendation.height
  );

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Gagal memproses gambar untuk kompresi otomatis.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return { file };
    }

    for (const scale of IMAGE_RESIZE_SCALE_STEPS) {
      const width = Math.max(1, Math.round(target.width * scale));
      const height = Math.max(1, Math.round(target.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of IMAGE_QUALITY_STEPS) {
        const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);
        if (webpBlob && webpBlob.size > 0 && webpBlob.size <= MAX_UPLOAD_SIZE_BYTES) {
          return {
            file: new File([webpBlob], optimizedFileName(file, 'image/webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            }),
            note: `Ukuran file dikompres otomatis dari ${formatFileSizeMB(file.size)} ke ${formatFileSizeMB(
              webpBlob.size
            )}.`,
          };
        }

        const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (jpegBlob && jpegBlob.size > 0 && jpegBlob.size <= MAX_UPLOAD_SIZE_BYTES) {
          return {
            file: new File([jpegBlob], optimizedFileName(file, 'image/jpeg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }),
            note: `Ukuran file dikompres otomatis dari ${formatFileSizeMB(file.size)} ke ${formatFileSizeMB(
              jpegBlob.size
            )}.`,
          };
        }
      }
    }

    return {
      file,
      note: `Ukuran awal ${formatFileSizeMB(
        file.size
      )}. Kompresi otomatis di browser belum mencapai ${MAX_UPLOAD_SIZE_LABEL}; server akan mencoba optimasi.`,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const parseSvgLength = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)(px)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const readSvgDimensions = async (file: File): Promise<{ width: number; height: number } | null> => {
  const raw = await file.text();
  const svgTagMatch = raw.match(/<svg\b[^>]*>/i);
  if (!svgTagMatch) return null;

  const svgTag = svgTagMatch[0];
  const widthAttr = svgTag.match(/\bwidth\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? null;
  const heightAttr = svgTag.match(/\bheight\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? null;
  const viewBoxAttr = svgTag.match(/\bviewBox\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? null;

  let width = parseSvgLength(widthAttr);
  let height = parseSvgLength(heightAttr);

  if ((width === null || height === null) && viewBoxAttr) {
    const parts = viewBoxAttr
      .trim()
      .split(/[,\s]+/)
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
    if (parts.length === 4) {
      if (width === null && parts[2] > 0) width = parts[2];
      if (height === null && parts[3] > 0) height = parts[3];
    }
  }

  if (width === null || height === null) return null;
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

export function ThemeCampaignFormSheet({
  open,
  mode,
  campaign,
  themes,
  iconPackOptions,
  accentAssetOptions,
  onOpenChange,
  onSubmit,
}: ThemeCampaignFormSheetProps) {
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assetFeedback, setAssetFeedback] = useState(EMPTY_ASSET_FEEDBACK);
  const [isUploadingAssets, setIsUploadingAssets] = useState(EMPTY_ASSET_UPLOAD_STATE);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && campaign) {
      setForm({
        campaign_group_key: campaign.campaign_group_key,
        campaign_name: campaign.campaign_name,
        theme_id: campaign.theme_id,
        description: campaign.description,
        enabled: campaign.enabled,
        priority: campaign.priority.toString(),
        start_at: toLocalDateTimeValue(campaign.start_at),
        end_at: toLocalDateTimeValue(campaign.end_at),
        light_mode_enabled: campaign.light_mode_enabled,
        dark_mode_enabled: campaign.dark_mode_enabled,
        assets: {
          web: mapPlatformAssets(campaign.assets.web),
          mobile: mapPlatformAssets(campaign.assets.mobile),
        },
      });
      setErrors({});
      setSubmitError(null);
      setAssetFeedback(EMPTY_ASSET_FEEDBACK);
      setIsUploadingAssets(EMPTY_ASSET_UPLOAD_STATE);
      return;
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    setAssetFeedback(EMPTY_ASSET_FEEDBACK);
    setIsUploadingAssets(EMPTY_ASSET_UPLOAD_STATE);
  }, [campaign, mode, open]);

  const normalizedIconPackOptions = useMemo(() => {
    const source = iconPackOptions.length > 0 ? iconPackOptions : ['outline-enterprise'];
    return Array.from(new Set(source));
  }, [iconPackOptions]);
  const normalizedAccentAssetOptions = useMemo(() => {
    const source = accentAssetOptions.length > 0 ? accentAssetOptions : ['none'];
    return Array.from(new Set(source));
  }, [accentAssetOptions]);
  const hasAssetUploadInProgress = useMemo(
    () =>
      Object.values(isUploadingAssets.web).some(Boolean) ||
      Object.values(isUploadingAssets.mobile).some(Boolean),
    [isUploadingAssets]
  );

  const updateField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updatePlatformAssetField = (
    platform: ThemePlatform,
    key: PlatformAssetEditableKey,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [platform]: {
          ...current.assets[platform],
          [key]: value,
        },
      },
    }));
  };

  const updateAppUiSlotField = (
    slotKey: AppUiSlotKey,
    fieldKey: AppUiSlotFieldKey,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      assets: {
        ...current.assets,
        mobile: {
          ...current.assets.mobile,
          app_ui: {
            ...mapAppUiSlots(current.assets.mobile.app_ui),
            [slotKey]: {
              ...normalizeAppUiSlot(current.assets.mobile.app_ui?.[slotKey]),
              [fieldKey]: value,
            },
          },
        },
      },
    }));
  };

  const setAssetFieldFeedback = (
    platform: ThemePlatform,
    key: AssetFieldKey,
    next: Partial<AssetFieldFeedback>
  ) => {
    setAssetFeedback((current) => ({
      ...current,
      [platform]: {
        ...current[platform],
        [key]: {
          ...current[platform][key],
          ...next,
        },
      },
    }));
  };

  const setAssetUploadingState = (
    platform: ThemePlatform,
    key: AssetFieldKey,
    value: boolean
  ) => {
    setIsUploadingAssets((current) => ({
      ...current,
      [platform]: {
        ...current[platform],
        [key]: value,
      },
    }));
  };

  const handleFileToPreview = async (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: ThemePlatform,
    key: AssetFieldKey
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const recommendation = RECOMMENDED_DIMENSIONS[platform][key];
    setAssetFieldFeedback(platform, key, { error: '', warning: '' });
    setAssetUploadingState(platform, key, true);
    const isMobileBackground = platform === 'mobile' && key === 'backgroundImage';

    try {
      let warningMessage = '';
      if (isMobileBackground) {
        if (!isSvgFile(file)) {
          throw new Error('backgroundImage mobile wajib file SVG.');
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          warningMessage = `Ukuran awal ${formatFileSizeMB(
            file.size
          )}. File akan dioptimasi otomatis di server jika diperlukan.`;
        }

        const dimensions = await readSvgDimensions(file);
        if (!dimensions) {
          throw new Error(
            'Dimensi SVG tidak dapat dibaca. Pastikan SVG memiliki width/height atau viewBox yang valid.'
          );
        }

        if (dimensions.height <= dimensions.width) {
          throw new Error('backgroundImage mobile wajib portrait (tinggi harus lebih besar dari lebar).');
        }

        if (
          dimensions.width !== recommendation.width ||
          dimensions.height !== recommendation.height
        ) {
          warningMessage = warningMessage
            ? `${warningMessage} Ukuran SVG terdeteksi ${dimensions.width}x${dimensions.height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`
            : `Ukuran SVG terdeteksi ${dimensions.width}x${dimensions.height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`;
        }

        const uploaded = await ThemeCampaignApi.uploadAsset(file, {
          platform,
          assetKey: key,
        });
        if (!uploaded.path?.trim()) {
          throw new Error('Upload gagal: path asset kosong.');
        }

        updatePlatformAssetField(platform, key, uploaded.path.trim());
        setAssetFieldFeedback(platform, key, {
          error: '',
          warning: warningMessage,
        });
      } else {
        const optimized = await optimizeRasterImageForUpload(file, recommendation);
        const fileToUpload = optimized.file;
        const dimensions = await readImageDimensions(fileToUpload);
        if (dimensions.width !== recommendation.width || dimensions.height !== recommendation.height) {
          warningMessage = `Ukuran terdeteksi ${dimensions.width}x${dimensions.height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`;
        }
        if (optimized.note) {
          warningMessage = warningMessage ? `${optimized.note} ${warningMessage}` : optimized.note;
        }

        const uploaded = await ThemeCampaignApi.uploadAsset(fileToUpload, {
          platform,
          assetKey: key,
        });
        if (!uploaded.path?.trim()) {
          throw new Error('Upload gagal: path asset kosong.');
        }

        updatePlatformAssetField(platform, key, uploaded.path.trim());
        setAssetFieldFeedback(platform, key, {
          error: '',
          warning: warningMessage,
        });
      }
    } catch (error: unknown) {
      setAssetFieldFeedback(platform, key, {
        error: error instanceof Error ? error.message : 'Upload asset gagal.',
        warning: '',
      });
    } finally {
      setAssetUploadingState(platform, key, false);
      event.target.value = '';
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.campaign_group_key.trim()) {
      nextErrors.campaign_group_key = 'campaign_group_key wajib diisi.';
    }
    if (!form.campaign_name.trim()) nextErrors.campaign_name = 'campaign_name wajib diisi.';
    if (!form.theme_id) nextErrors.theme_id = 'theme_id wajib dipilih.';
    if (!form.priority || Number.isNaN(Number(form.priority))) nextErrors.priority = 'priority wajib diisi.';

    const startAt = toIsoValue(form.start_at);
    const endAt = toIsoValue(form.end_at);
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      nextErrors.end_at = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (hasAssetUploadInProgress) {
      setSubmitError('Tunggu sampai upload asset selesai.');
      return;
    }
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: ThemeCampaignFormValues = {
      campaign_group_key: form.campaign_group_key.trim(),
      campaign_name: form.campaign_name.trim(),
      theme_id: form.theme_id,
      description: form.description.trim(),
      enabled: form.enabled,
      priority: Number(form.priority),
      start_at: toIsoValue(form.start_at),
      end_at: toIsoValue(form.end_at),
      light_mode_enabled: form.light_mode_enabled,
      dark_mode_enabled: form.dark_mode_enabled,
      assets: {
        web: { ...form.assets.web },
        mobile: { ...form.assets.mobile },
      },
    };

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Gagal menyimpan kampanye');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionClassName = 'space-y-3 rounded-xl border bg-muted/20 p-4';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Buat Kampanye' : 'Ubah Kampanye'}</SheetTitle>
          <SheetDescription>
            Kelola aturan kampanye bersama dan aset visual per platform.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-4">
            <section className={sectionClassName}>
              <h3 className="font-medium">Informasi Dasar</h3>
              <div className="space-y-2">
                <Label htmlFor="campaign_group_key">campaign_group_key *</Label>
                <Input
                  id="campaign_group_key"
                  value={form.campaign_group_key}
                  onChange={(event) => updateField('campaign_group_key', event.target.value)}
                  placeholder="ramadan-2026-core"
                />
                {errors.campaign_group_key && (
                  <p className="text-xs text-destructive">{errors.campaign_group_key}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign_name">campaign_name *</Label>
                <Input
                  id="campaign_name"
                  value={form.campaign_name}
                  onChange={(event) => updateField('campaign_name', event.target.value)}
                />
                {errors.campaign_name && <p className="text-xs text-destructive">{errors.campaign_name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme_id">theme_id *</Label>
                  <Select value={form.theme_id} onValueChange={(value) => updateField('theme_id', value)}>
                    <SelectTrigger id="theme_id">
                      <SelectValue placeholder="Pilih tema" />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.theme_id && <p className="text-xs text-destructive">{errors.theme_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">priority *</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={0}
                    value={form.priority}
                    onChange={(event) => updateField('priority', event.target.value)}
                  />
                  {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <Label htmlFor="enabled_switch">enabled</Label>
                <Switch
                  id="enabled_switch"
                  checked={form.enabled}
                  onCheckedChange={(value) => updateField('enabled', value)}
                />
              </div>
            </section>

            <section className={sectionClassName}>
              <h3 className="font-medium">Jadwal</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_at">start_at</Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(event) => updateField('start_at', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_at">end_at</Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(event) => updateField('end_at', event.target.value)}
                  />
                  {errors.end_at && <p className="text-xs text-destructive">{errors.end_at}</p>}
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <h3 className="font-medium">Dukungan Mode</h3>
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <Label htmlFor="light_mode_enabled">light_mode_enabled</Label>
                <Switch
                  id="light_mode_enabled"
                  checked={form.light_mode_enabled}
                  onCheckedChange={(value) => updateField('light_mode_enabled', value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <Label htmlFor="dark_mode_enabled">dark_mode_enabled</Label>
                <Switch
                  id="dark_mode_enabled"
                  checked={form.dark_mode_enabled}
                  onCheckedChange={(value) => updateField('dark_mode_enabled', value)}
                />
              </div>
            </section>

            <section className={sectionClassName}>
                <h3 className="font-medium">Aset Visual per Platform</h3>
                <p className="text-xs text-muted-foreground">
                  Upload langsung ke server lokal, target maks {MAX_UPLOAD_SIZE_LABEL} per file. Jika ukuran
                  lebih besar, sistem akan mencoba kompresi otomatis. Untuk mobile `backgroundImage`, file
                  wajib SVG portrait.
                </p>
              <Tabs defaultValue="web" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="web">Web</TabsTrigger>
                  <TabsTrigger value="mobile">Mobile</TabsTrigger>
                </TabsList>
                <TabsContent value="web" className="space-y-3">
                  <PlatformAssetsEditor
                    platform="web"
                    assets={form.assets.web}
                    iconPackOptions={normalizedIconPackOptions}
                    accentAssetOptions={normalizedAccentAssetOptions}
                    onFileChange={handleFileToPreview}
                    onAssetChange={updatePlatformAssetField}
                    feedback={assetFeedback.web}
                    isUploading={isUploadingAssets.web}
                  />
                </TabsContent>
                <TabsContent value="mobile" className="space-y-3">
                  <PlatformAssetsEditor
                    platform="mobile"
                    assets={form.assets.mobile}
                    iconPackOptions={normalizedIconPackOptions}
                    accentAssetOptions={normalizedAccentAssetOptions}
                    onFileChange={handleFileToPreview}
                    onAssetChange={updatePlatformAssetField}
                    feedback={assetFeedback.mobile}
                    isUploading={isUploadingAssets.mobile}
                  />
                  <Separator />
                  <AppUiSlotsEditor
                    slots={mapAppUiSlots(form.assets.mobile.app_ui)}
                    onSlotFieldChange={updateAppUiSlotField}
                  />
                </TabsContent>
              </Tabs>
            </section>

            <Separator />
            <section className="space-y-2 text-xs text-muted-foreground">
              <h3 className="text-sm font-medium text-foreground">Aturan Validasi</h3>
              <p>- campaign_group_key wajib</p>
              <p>- campaign_name wajib</p>
              <p>- theme_id wajib</p>
              <p>- priority wajib</p>
              <p>- tanggal selesai tidak boleh lebih awal dari tanggal mulai</p>
            </section>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || hasAssetUploadInProgress}>
            {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Buat Kampanye' : 'Simpan Perubahan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface PlatformAssetsEditorProps {
  platform: ThemePlatform;
  assets: ThemePlatformAssets;
  feedback: Record<AssetFieldKey, AssetFieldFeedback>;
  isUploading: Record<AssetFieldKey, boolean>;
  iconPackOptions: string[];
  accentAssetOptions: string[];
  onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: ThemePlatform,
    key: AssetFieldKey
  ) => void;
  onAssetChange: (
    platform: ThemePlatform,
    key: PlatformAssetEditableKey,
    value: string
  ) => void;
}

function PlatformAssetsEditor({
  platform,
  assets,
  feedback,
  isUploading,
  iconPackOptions,
  accentAssetOptions,
  onFileChange,
  onAssetChange,
}: PlatformAssetsEditorProps) {
  const backgroundUploadId = `${platform}_background_upload`;
  const illustrationUploadId = `${platform}_illustration_upload`;
  const iconPackId = `${platform}_icon_pack`;
  const accentAssetId = `${platform}_accent_asset`;
  const isMobileBackground = platform === 'mobile';
  const backgroundImageClass = isMobileBackground ? 'object-contain bg-muted/20' : 'object-cover';
  const backgroundContainerClass = isMobileBackground ? 'h-56' : 'h-28';

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={backgroundUploadId}>unggah / pratinjau gambar latar</Label>
          <p className="text-[11px] text-muted-foreground">
            `backgroundImage` • maks {MAX_UPLOAD_SIZE_LABEL} • saran{' '}
            {RECOMMENDED_DIMENSIONS[platform].backgroundImage.width}x
            {RECOMMENDED_DIMENSIONS[platform].backgroundImage.height}px
            {isMobileBackground ? ' • wajib SVG portrait' : ''}
          </p>
          <Input
            id={backgroundUploadId}
            type="file"
            accept={isMobileBackground ? '.svg,image/svg+xml' : 'image/*'}
            onChange={(event) => onFileChange(event, platform, 'backgroundImage')}
            disabled={isUploading.backgroundImage}
          />
          {isUploading.backgroundImage ? (
            <p className="text-xs text-muted-foreground">Mengunggah asset...</p>
          ) : null}
          {feedback.backgroundImage.error ? (
            <p className="text-xs text-destructive">{feedback.backgroundImage.error}</p>
          ) : null}
          {!feedback.backgroundImage.error && feedback.backgroundImage.warning ? (
            <p className="text-xs text-amber-600">{feedback.backgroundImage.warning}</p>
          ) : null}
          <div className={`relative overflow-hidden rounded-lg border bg-card ${backgroundContainerClass}`}>
            {assets.backgroundImage ? (
              <NextImage
                src={assets.backgroundImage}
                alt={`${platform} background preview`}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className={backgroundImageClass}
              />
            ) : (
              <div
                className="flex h-full items-center justify-center text-xs text-muted-foreground"
              >
                <ImagePlus className="mr-1 h-4 w-4" />
                Belum ada gambar
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={illustrationUploadId}>unggah / pratinjau ilustrasi</Label>
          <p className="text-[11px] text-muted-foreground">
            `illustration` • maks {MAX_UPLOAD_SIZE_LABEL} • saran{' '}
            {RECOMMENDED_DIMENSIONS[platform].illustration.width}x
            {RECOMMENDED_DIMENSIONS[platform].illustration.height}px
          </p>
          <Input
            id={illustrationUploadId}
            type="file"
            accept="image/*"
            onChange={(event) => onFileChange(event, platform, 'illustration')}
            disabled={isUploading.illustration}
          />
          {isUploading.illustration ? (
            <p className="text-xs text-muted-foreground">Mengunggah asset...</p>
          ) : null}
          {feedback.illustration.error ? (
            <p className="text-xs text-destructive">{feedback.illustration.error}</p>
          ) : null}
          {!feedback.illustration.error && feedback.illustration.warning ? (
            <p className="text-xs text-amber-600">{feedback.illustration.warning}</p>
          ) : null}
          <div className="relative h-28 overflow-hidden rounded-lg border bg-card">
            {assets.illustration ? (
              <NextImage
                src={assets.illustration}
                alt={`${platform} illustration preview`}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                <ImagePlus className="mr-1 h-4 w-4" />
                Belum ada gambar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={iconPackId}>pilih icon pack</Label>
          <Select value={assets.iconPack} onValueChange={(value) => onAssetChange(platform, 'iconPack', value)}>
            <SelectTrigger id={iconPackId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconPackOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={accentAssetId}>pilih accent asset</Label>
          <Select value={assets.accentAsset} onValueChange={(value) => onAssetChange(platform, 'accentAsset', value)}>
            <SelectTrigger id={accentAssetId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accentAssetOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

interface AppUiSlotsEditorProps {
  slots: ThemeAppUiSlots;
  onSlotFieldChange: (
    slotKey: AppUiSlotKey,
    fieldKey: AppUiSlotFieldKey,
    value: string
  ) => void;
}

function AppUiSlotsEditor({ slots, onSlotFieldChange }: AppUiSlotsEditorProps) {
  const mappedSlots = mapAppUiSlots(slots);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">Mobile App UI Slots</h4>
        <p className="text-xs text-muted-foreground">
          Mapping slot runtime `assets.mobile.app_ui` untuk navbar, sidebar, footer, dashboard,
          notification banner, empty state illustration, dan modal accent.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Runtime preview</p>
        <MobileAppUiRuntimePreview slots={mappedSlots} className="mx-auto max-w-[320px]" />
      </div>

      <div className="space-y-3">
        {APP_UI_SLOT_CONFIG.map((slot) => {
          const slotValue = normalizeAppUiSlot(mappedSlots[slot.key]);
          return (
            <div key={slot.key} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{slot.label}</p>
                <p className="text-xs text-muted-foreground">{slot.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {APP_UI_SLOT_FIELD_CONFIG.map((field) => (
                  <div key={`${slot.key}-${field.key}`} className="space-y-1">
                    <Label htmlFor={`${slot.key}-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`${slot.key}-${field.key}`}
                      value={slotValue[field.key] || ''}
                      onChange={(event) =>
                        onSlotFieldChange(slot.key, field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
