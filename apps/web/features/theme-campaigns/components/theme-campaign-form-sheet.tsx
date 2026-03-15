'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
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

interface AssetFieldFeedback {
  error: string;
  warning: string;
}

const EMPTY_PLATFORM_ASSETS: ThemePlatformAssets = {
  backgroundImage: '',
  illustration: '',
  iconPack: 'outline-enterprise',
  accentAsset: 'none',
};

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = '2MB';
const TARGET_IMAGE_MIME = 'image/webp';
const MIN_IMAGE_QUALITY = 0.55;
const QUALITY_STEP = 0.07;
const SCALE_STEP = 0.9;
const SVG_MIME_TYPE = 'image/svg+xml';

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

const mapPlatformAssets = (assets?: ThemePlatformAssets): ThemePlatformAssets => ({
  backgroundImage: assets?.backgroundImage || '',
  illustration: assets?.illustration || '',
  iconPack: assets?.iconPack || 'outline-enterprise',
  accentAsset: assets?.accentAsset || 'none',
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

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('failed to read file'));
    };
    reader.onerror = () => reject(new Error('failed to read file'));
    reader.readAsDataURL(file);
  });

const dataUrlSizeBytes = (dataUrl: string): number => {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return 0;
  const base64Length = dataUrl.length - commaIndex - 1;
  return Math.ceil((base64Length * 3) / 4);
};

const drawToDataUrl = (
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(TARGET_IMAGE_MIME, quality);
};

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('failed to load image'));
    };

    image.src = objectUrl;
  });

const resizeAndCompressImage = async (
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> => {
  const image = await loadImageElement(file);
  const baseScale = Math.min(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight, 1);

  let width = Math.max(1, Math.round(image.naturalWidth * baseScale));
  let height = Math.max(1, Math.round(image.naturalHeight * baseScale));
  let quality = 0.92;
  let dataUrl = drawToDataUrl(image, width, height, quality);
  let sizeBytes = dataUrlSizeBytes(dataUrl);

  while (sizeBytes > MAX_UPLOAD_SIZE_BYTES && quality > MIN_IMAGE_QUALITY) {
    quality = Math.max(MIN_IMAGE_QUALITY, quality - QUALITY_STEP);
    dataUrl = drawToDataUrl(image, width, height, quality);
    sizeBytes = dataUrlSizeBytes(dataUrl);
  }

  while (sizeBytes > MAX_UPLOAD_SIZE_BYTES && (width > 320 || height > 320)) {
    width = Math.max(1, Math.round(width * SCALE_STEP));
    height = Math.max(1, Math.round(height * SCALE_STEP));
    quality = 0.9;
    dataUrl = drawToDataUrl(image, width, height, quality);
    sizeBytes = dataUrlSizeBytes(dataUrl);

    while (sizeBytes > MAX_UPLOAD_SIZE_BYTES && quality > MIN_IMAGE_QUALITY) {
      quality = Math.max(MIN_IMAGE_QUALITY, quality - QUALITY_STEP);
      dataUrl = drawToDataUrl(image, width, height, quality);
      sizeBytes = dataUrlSizeBytes(dataUrl);
    }
  }

  if (!dataUrl) {
    throw new Error('failed to transform image');
  }

  return { dataUrl, width, height, sizeBytes };
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
      return;
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    setAssetFeedback(EMPTY_ASSET_FEEDBACK);
  }, [campaign, mode, open]);

  const normalizedIconPackOptions = useMemo(() => {
    const source = iconPackOptions.length > 0 ? iconPackOptions : ['outline-enterprise'];
    return Array.from(new Set(source));
  }, [iconPackOptions]);
  const normalizedAccentAssetOptions = useMemo(() => {
    const source = accentAssetOptions.length > 0 ? accentAssetOptions : ['none'];
    return Array.from(new Set(source));
  }, [accentAssetOptions]);

  const updateField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updatePlatformAssetField = (
    platform: ThemePlatform,
    key: keyof ThemePlatformAssets,
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

  const handleFileToPreview = async (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: ThemePlatform,
    key: AssetFieldKey
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const recommendation = RECOMMENDED_DIMENSIONS[platform][key];
    setAssetFieldFeedback(platform, key, { error: '', warning: '' });
    const isMobileBackground = platform === 'mobile' && key === 'backgroundImage';

    if (isMobileBackground) {
      if (!isSvgFile(file)) {
        setAssetFieldFeedback(platform, key, {
          error: 'backgroundImage mobile wajib file SVG.',
          warning: '',
        });
        event.target.value = '';
        return;
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setAssetFieldFeedback(platform, key, {
          error: `Ukuran file melebihi ${MAX_UPLOAD_SIZE_LABEL}.`,
          warning: '',
        });
        event.target.value = '';
        return;
      }

      try {
        const dimensions = await readSvgDimensions(file);
        if (!dimensions) {
          setAssetFieldFeedback(platform, key, {
            error:
              'Dimensi SVG tidak dapat dibaca. Pastikan SVG memiliki width/height atau viewBox yang valid.',
            warning: '',
          });
          event.target.value = '';
          return;
        }

        const { width, height } = dimensions;
        if (height <= width) {
          setAssetFieldFeedback(platform, key, {
            error: 'backgroundImage mobile wajib portrait (tinggi harus lebih besar dari lebar).',
            warning: '',
          });
          event.target.value = '';
          return;
        }

        const result = await readFileAsDataUrl(file);
        updatePlatformAssetField(platform, key, result);

        const warningMessage =
          width !== recommendation.width || height !== recommendation.height
            ? `Ukuran SVG terdeteksi ${width}x${height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`
            : '';
        setAssetFieldFeedback(platform, key, {
          error: '',
          warning: warningMessage,
        });
      } catch {
        setAssetFieldFeedback(platform, key, {
          error: 'Gagal membaca file SVG.',
          warning: '',
        });
        event.target.value = '';
      }

      return;
    }

    let warningMessage = '';
    let shouldAutoTransform = false;
    let detectedWidth = 0;
    let detectedHeight = 0;
    try {
      const { width, height } = await readImageDimensions(file);
      detectedWidth = width;
      detectedHeight = height;
      shouldAutoTransform =
        file.size > MAX_UPLOAD_SIZE_BYTES ||
        width > recommendation.width ||
        height > recommendation.height;

      if (width !== recommendation.width || height !== recommendation.height) {
        warningMessage = `Ukuran terdeteksi ${width}x${height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`;
      }
    } catch {
      setAssetFieldFeedback(platform, key, {
        error: 'Dimensi gambar tidak dapat dibaca. Pastikan file image valid.',
        warning: '',
      });
      event.target.value = '';
      return;
    }

    if (shouldAutoTransform) {
      try {
        const transformed = await resizeAndCompressImage(
          file,
          recommendation.width,
          recommendation.height
        );
        updatePlatformAssetField(platform, key, transformed.dataUrl);
        warningMessage = `File otomatis diresize/kompresi ke ${transformed.width}x${transformed.height}px (${Math.round(
          transformed.sizeBytes / 1024
        )}KB).`;
      } catch {
        setAssetFieldFeedback(platform, key, {
          error: `Gagal memproses gambar otomatis. Gunakan file <= ${MAX_UPLOAD_SIZE_LABEL} dengan dimensi lebih kecil.`,
          warning: '',
        });
        event.target.value = '';
        return;
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        updatePlatformAssetField(platform, key, result);
      };
      reader.readAsDataURL(file);
    }

    const isStillOverLimit = file.size > MAX_UPLOAD_SIZE_BYTES && !shouldAutoTransform;
    if (isStillOverLimit) {
      setAssetFieldFeedback(platform, key, {
        error: `Ukuran file melebihi ${MAX_UPLOAD_SIZE_LABEL}.`,
        warning: '',
      });
      event.target.value = '';
      return;
    }

    if (!warningMessage && (detectedWidth !== recommendation.width || detectedHeight !== recommendation.height)) {
      warningMessage = `Ukuran terdeteksi ${detectedWidth}x${detectedHeight}px. Disarankan ${recommendation.width}x${recommendation.height}px.`;
    }

    setAssetFieldFeedback(platform, key, {
      error: '',
      warning: warningMessage,
    });
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
                  Batas upload: target maks {MAX_UPLOAD_SIZE_LABEL} per gambar. Untuk mobile `backgroundImage`,
                  file wajib SVG portrait dan tidak dikonversi otomatis.
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
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
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
  iconPackOptions: string[];
  accentAssetOptions: string[];
  onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: ThemePlatform,
    key: AssetFieldKey
  ) => void;
  onAssetChange: (
    platform: ThemePlatform,
    key: keyof ThemePlatformAssets,
    value: string
  ) => void;
}

function PlatformAssetsEditor({
  platform,
  assets,
  feedback,
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
  const backgroundPreviewClass = isMobileBackground
    ? 'h-56 w-full object-contain bg-muted/20'
    : 'h-28 w-full object-cover';
  const backgroundPlaceholderClass = isMobileBackground ? 'h-56' : 'h-28';

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
          />
          {feedback.backgroundImage.error ? (
            <p className="text-xs text-destructive">{feedback.backgroundImage.error}</p>
          ) : null}
          {!feedback.backgroundImage.error && feedback.backgroundImage.warning ? (
            <p className="text-xs text-amber-600">{feedback.backgroundImage.warning}</p>
          ) : null}
          <div className="overflow-hidden rounded-lg border bg-card">
            {assets.backgroundImage ? (
              <img
                src={assets.backgroundImage}
                alt={`${platform} background preview`}
                className={backgroundPreviewClass}
              />
            ) : (
              <div
                className={`flex items-center justify-center text-xs text-muted-foreground ${backgroundPlaceholderClass}`}
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
          />
          {feedback.illustration.error ? (
            <p className="text-xs text-destructive">{feedback.illustration.error}</p>
          ) : null}
          {!feedback.illustration.error && feedback.illustration.warning ? (
            <p className="text-xs text-amber-600">{feedback.illustration.warning}</p>
          ) : null}
          <div className="overflow-hidden rounded-lg border bg-card">
            {assets.illustration ? (
              <img
                src={assets.illustration}
                alt={`${platform} illustration preview`}
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
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
