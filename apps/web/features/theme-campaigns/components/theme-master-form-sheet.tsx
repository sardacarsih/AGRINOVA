'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ThemeAppUiSlots,
  ThemeAssetManifest,
  ThemeEntity,
  ThemeMasterFormValues,
  ThemeMode,
  ThemeTokenConfig,
} from '@/features/theme-campaigns/types/theme-campaign';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';
import {
  APP_UI_SLOT_CONFIG,
  APP_UI_COLOR_FIELD_KEYS,
  normalizeAppUiSlot,
  mapAppUiSlots,
  type AppUiSlotKey,
  type AppUiColorFieldKey,
} from '@/features/theme-campaigns/constants/app-ui-slot-constants';

type FormMode = 'create' | 'edit';

interface ThemeMasterFormSheetProps {
  open: boolean;
  mode: FormMode;
  theme: ThemeEntity | null;
  iconPackOptions: string[];
  accentAssetOptions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ThemeMasterFormValues) => Promise<void> | void;
}

interface ThemeTokenFields {
  accentColor: string;
  accentSoftColor: string;
  loginCardBorder: string;
}

interface ThemeAssetFields {
  backgroundImage: string;
  illustration: string;
  iconPack: string;
  accentAsset: string;
}

interface ThemeModesDraft<T> {
  light: T;
  dark: T;
}

interface ColorPreset {
  id: string;
  label: string;
  description: string;
  tokens: ThemeModesDraft<ThemeTokenFields>;
}

interface AppUiColorPreset {
  id: string;
  label: string;
  description: string;
  slots: ThemeModesDraft<ThemeAppUiSlots>;
}

interface FormDraft {
  code: string;
  name: string;
  type: 'base' | 'seasonal';
  is_active: boolean;
  token_json: ThemeModesDraft<ThemeTokenFields>;
  asset_manifest_json: ThemeModesDraft<ThemeAssetFields>;
  app_ui_slots: ThemeModesDraft<ThemeAppUiSlots>;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const THEME_MODES: ThemeMode[] = ['light', 'dark'];

const normalizeHexColor = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_REGEX.test(withHash)) return null;

  if (withHash.length === 4) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return withHash.toLowerCase();
};

const getColorPickerValue = (value: string, fallback: string): string =>
  normalizeHexColor(value) ?? fallback;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const EMPTY_LIGHT_TOKENS: ThemeTokenFields = {
  accentColor: '#059669',
  accentSoftColor: '#d1fae5',
  loginCardBorder: '#34d399',
};

const EMPTY_DARK_TOKENS: ThemeTokenFields = {
  accentColor: '#22c55e',
  accentSoftColor: '#14532d',
  loginCardBorder: '#4ade80',
};

const EMPTY_TOKEN_MODES: ThemeModesDraft<ThemeTokenFields> = {
  light: { ...EMPTY_LIGHT_TOKENS },
  dark: { ...EMPTY_DARK_TOKENS },
};

const EMPTY_ASSETS: ThemeAssetFields = {
  backgroundImage: '',
  illustration: '',
  iconPack: 'outline-enterprise',
  accentAsset: 'none',
};

const EMPTY_ASSET_MODES: ThemeModesDraft<ThemeAssetFields> = {
  light: { ...EMPTY_ASSETS },
  dark: { ...EMPTY_ASSETS },
};

type AssetFieldKey = 'backgroundImage' | 'illustration';

interface AssetFieldFeedback {
  error: string;
  warning: string;
}

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = '2MB';
const SVG_MIME_TYPE = 'image/svg+xml';
const IMAGE_RESIZE_SCALE_STEPS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const IMAGE_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];

const WEB_RECOMMENDED_DIMENSIONS: Record<AssetFieldKey, { width: number; height: number }> = {
  backgroundImage: { width: 1920, height: 1080 },
  illustration: { width: 1500, height: 600 },
};

const EMPTY_ASSET_FEEDBACK: Record<AssetFieldKey, AssetFieldFeedback> = {
  backgroundImage: { error: '', warning: '' },
  illustration: { error: '', warning: '' },
};

const EMPTY_ASSET_UPLOADING: Record<AssetFieldKey, boolean> = {
  backgroundImage: false,
  illustration: false,
};

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

const EMPTY_APP_UI_SLOT_MODES: ThemeModesDraft<ThemeAppUiSlots> = {
  light: {},
  dark: {},
};

const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'forest-calm',
    label: 'Forest Calm',
    description: 'Hijau natural untuk produk agrikultur modern.',
    tokens: {
      light: {
        accentColor: '#15803d',
        accentSoftColor: '#dcfce7',
        loginCardBorder: '#22c55e',
      },
      dark: {
        accentColor: '#22c55e',
        accentSoftColor: '#14532d',
        loginCardBorder: '#4ade80',
      },
    },
  },
  {
    id: 'earth-professional',
    label: 'Earth Professional',
    description: 'Nuansa coklat-hijau netral yang terasa premium.',
    tokens: {
      light: {
        accentColor: '#4d7c0f',
        accentSoftColor: '#f7fee7',
        loginCardBorder: '#84cc16',
      },
      dark: {
        accentColor: '#84cc16',
        accentSoftColor: '#365314',
        loginCardBorder: '#a3e635',
      },
    },
  },
  {
    id: 'ocean-fresh',
    label: 'Ocean Fresh',
    description: 'Kombinasi biru-hijau bersih untuk dashboard data.',
    tokens: {
      light: {
        accentColor: '#0f766e',
        accentSoftColor: '#ccfbf1',
        loginCardBorder: '#14b8a6',
      },
      dark: {
        accentColor: '#2dd4bf',
        accentSoftColor: '#134e4a',
        loginCardBorder: '#5eead4',
      },
    },
  },
  {
    id: 'sunrise-energy',
    label: 'Sunrise Energy',
    description: 'Aksen hangat untuk kampanye musiman/promosi.',
    tokens: {
      light: {
        accentColor: '#ea580c',
        accentSoftColor: '#ffedd5',
        loginCardBorder: '#fb923c',
      },
      dark: {
        accentColor: '#fb923c',
        accentSoftColor: '#7c2d12',
        loginCardBorder: '#fdba74',
      },
    },
  },
  {
    id: 'midnight-slate',
    label: 'Midnight Slate',
    description: 'Biru slate profesional untuk dashboard enterprise.',
    tokens: {
      light: {
        accentColor: '#1d4ed8',
        accentSoftColor: '#dbeafe',
        loginCardBorder: '#3b82f6',
      },
      dark: {
        accentColor: '#60a5fa',
        accentSoftColor: '#1e3a8a',
        loginCardBorder: '#93c5fd',
      },
    },
  },
  {
    id: 'royal-indigo',
    label: 'Royal Indigo',
    description: 'Nuansa indigo premium dengan kontras kuat.',
    tokens: {
      light: {
        accentColor: '#4338ca',
        accentSoftColor: '#e0e7ff',
        loginCardBorder: '#6366f1',
      },
      dark: {
        accentColor: '#818cf8',
        accentSoftColor: '#312e81',
        loginCardBorder: '#a5b4fc',
      },
    },
  },
  {
    id: 'crimson-focus',
    label: 'Crimson Focus',
    description: 'Aksen merah tegas untuk notifikasi dan CTA penting.',
    tokens: {
      light: {
        accentColor: '#dc2626',
        accentSoftColor: '#fee2e2',
        loginCardBorder: '#ef4444',
      },
      dark: {
        accentColor: '#f87171',
        accentSoftColor: '#7f1d1d',
        loginCardBorder: '#fca5a5',
      },
    },
  },
  {
    id: 'amber-harvest',
    label: 'Amber Harvest',
    description: 'Palet kuning-amber cerah untuk tema panen.',
    tokens: {
      light: {
        accentColor: '#d97706',
        accentSoftColor: '#fef3c7',
        loginCardBorder: '#f59e0b',
      },
      dark: {
        accentColor: '#fbbf24',
        accentSoftColor: '#78350f',
        loginCardBorder: '#fcd34d',
      },
    },
  },
  {
    id: 'teal-breeze',
    label: 'Teal Breeze',
    description: 'Teal modern yang seimbang untuk UI data-heavy.',
    tokens: {
      light: {
        accentColor: '#0d9488',
        accentSoftColor: '#ccfbf1',
        loginCardBorder: '#14b8a6',
      },
      dark: {
        accentColor: '#2dd4bf',
        accentSoftColor: '#134e4a',
        loginCardBorder: '#5eead4',
      },
    },
  },
  {
    id: 'mono-contrast',
    label: 'Mono Contrast',
    description: 'Monokrom high-contrast untuk keterbacaan maksimal.',
    tokens: {
      light: {
        accentColor: '#374151',
        accentSoftColor: '#f3f4f6',
        loginCardBorder: '#6b7280',
      },
      dark: {
        accentColor: '#d1d5db',
        accentSoftColor: '#1f2937',
        loginCardBorder: '#e5e7eb',
      },
    },
  },
];

const APP_UI_COLOR_PRESETS: AppUiColorPreset[] = [
  {
    id: 'forest-dashboard',
    label: 'Forest Dashboard',
    description: 'Hijau natural — aksen dashboard segar dan navbar gelap.',
    slots: {
      light: {
        dashboard: { accentColor: '#059669', backgroundColor: '#f0fdf4', foregroundColor: '#ffffff', textColor: '#064e3b', borderColor: '#a7f3d0', iconColor: '#10b981' },
        navbar: { backgroundColor: '#0f172a', foregroundColor: '#ffffff', textColor: '#e2e8f0', borderColor: '#1e293b', accentColor: '#34d399', iconColor: '#93c5fd' },
        footer: { backgroundColor: '#0f172a', foregroundColor: '#ffffff', textColor: '#cbd5e1', borderColor: '#1e293b', accentColor: '#34d399', iconColor: '#94a3b8' },
      },
      dark: {
        dashboard: { accentColor: '#34d399', backgroundColor: '#022c22', foregroundColor: '#0d1b2a', textColor: '#d1fae5', borderColor: '#065f46', iconColor: '#6ee7b7' },
        navbar: { backgroundColor: '#020617', foregroundColor: '#0f172a', textColor: '#e2e8f0', borderColor: '#1e293b', accentColor: '#6ee7b7', iconColor: '#93c5fd' },
        footer: { backgroundColor: '#020617', foregroundColor: '#0f172a', textColor: '#94a3b8', borderColor: '#1e293b', accentColor: '#6ee7b7', iconColor: '#64748b' },
      },
    },
  },
  {
    id: 'ocean-panel',
    label: 'Ocean Panel',
    description: 'Biru-teal segar — nuansa dashboard data dan monitoring.',
    slots: {
      light: {
        dashboard: { accentColor: '#0891b2', backgroundColor: '#ecfeff', foregroundColor: '#ffffff', textColor: '#164e63', borderColor: '#a5f3fc', iconColor: '#06b6d4' },
        navbar: { backgroundColor: '#0c4a6e', foregroundColor: '#0e7490', textColor: '#e0f2fe', borderColor: '#075985', accentColor: '#67e8f9', iconColor: '#bae6fd' },
        footer: { backgroundColor: '#0c4a6e', foregroundColor: '#0e7490', textColor: '#bae6fd', borderColor: '#075985', accentColor: '#67e8f9', iconColor: '#7dd3fc' },
      },
      dark: {
        dashboard: { accentColor: '#22d3ee', backgroundColor: '#082f49', foregroundColor: '#0c4a6e', textColor: '#cffafe', borderColor: '#155e75', iconColor: '#67e8f9' },
        navbar: { backgroundColor: '#020617', foregroundColor: '#082f49', textColor: '#e0f2fe', borderColor: '#0c4a6e', accentColor: '#67e8f9', iconColor: '#7dd3fc' },
        footer: { backgroundColor: '#020617', foregroundColor: '#082f49', textColor: '#94a3b8', borderColor: '#0c4a6e', accentColor: '#67e8f9', iconColor: '#64748b' },
      },
    },
  },
  {
    id: 'amber-field',
    label: 'Amber Field',
    description: 'Kuning-amber cerah — tema panen dan musim buah.',
    slots: {
      light: {
        dashboard: { accentColor: '#d97706', backgroundColor: '#fffbeb', foregroundColor: '#ffffff', textColor: '#451a03', borderColor: '#fde68a', iconColor: '#f59e0b' },
        navbar: { backgroundColor: '#451a03', foregroundColor: '#78350f', textColor: '#fef3c7', borderColor: '#78350f', accentColor: '#fbbf24', iconColor: '#fde68a' },
        footer: { backgroundColor: '#451a03', foregroundColor: '#78350f', textColor: '#fcd34d', borderColor: '#78350f', accentColor: '#fbbf24', iconColor: '#fde68a' },
      },
      dark: {
        dashboard: { accentColor: '#fbbf24', backgroundColor: '#1c1002', foregroundColor: '#451a03', textColor: '#fef3c7', borderColor: '#78350f', iconColor: '#fcd34d' },
        navbar: { backgroundColor: '#0c0a09', foregroundColor: '#1c1002', textColor: '#fef3c7', borderColor: '#451a03', accentColor: '#fcd34d', iconColor: '#fde68a' },
        footer: { backgroundColor: '#0c0a09', foregroundColor: '#1c1002', textColor: '#a8a29e', borderColor: '#451a03', accentColor: '#fcd34d', iconColor: '#78716c' },
      },
    },
  },
  {
    id: 'slate-enterprise',
    label: 'Slate Enterprise',
    description: 'Abu profesional — dashboard enterprise yang netral.',
    slots: {
      light: {
        dashboard: { accentColor: '#475569', backgroundColor: '#f8fafc', foregroundColor: '#ffffff', textColor: '#0f172a', borderColor: '#cbd5e1', iconColor: '#64748b' },
        navbar: { backgroundColor: '#0f172a', foregroundColor: '#1e293b', textColor: '#f1f5f9', borderColor: '#334155', accentColor: '#94a3b8', iconColor: '#cbd5e1' },
        footer: { backgroundColor: '#0f172a', foregroundColor: '#1e293b', textColor: '#94a3b8', borderColor: '#334155', accentColor: '#94a3b8', iconColor: '#64748b' },
      },
      dark: {
        dashboard: { accentColor: '#94a3b8', backgroundColor: '#020617', foregroundColor: '#0f172a', textColor: '#f1f5f9', borderColor: '#334155', iconColor: '#cbd5e1' },
        navbar: { backgroundColor: '#020617', foregroundColor: '#0f172a', textColor: '#e2e8f0', borderColor: '#1e293b', accentColor: '#cbd5e1', iconColor: '#94a3b8' },
        footer: { backgroundColor: '#020617', foregroundColor: '#0f172a', textColor: '#64748b', borderColor: '#1e293b', accentColor: '#cbd5e1', iconColor: '#475569' },
      },
    },
  },
  {
    id: 'royal-garden',
    label: 'Royal Garden',
    description: 'Ungu premium — nuansa elegan untuk event spesial.',
    slots: {
      light: {
        dashboard: { accentColor: '#7c3aed', backgroundColor: '#f5f3ff', foregroundColor: '#ffffff', textColor: '#1e1b4b', borderColor: '#c4b5fd', iconColor: '#8b5cf6' },
        navbar: { backgroundColor: '#1e1b4b', foregroundColor: '#312e81', textColor: '#ede9fe', borderColor: '#3730a3', accentColor: '#a78bfa', iconColor: '#c4b5fd' },
        footer: { backgroundColor: '#1e1b4b', foregroundColor: '#312e81', textColor: '#a78bfa', borderColor: '#3730a3', accentColor: '#a78bfa', iconColor: '#818cf8' },
      },
      dark: {
        dashboard: { accentColor: '#a78bfa', backgroundColor: '#0b0521', foregroundColor: '#1e1b4b', textColor: '#ede9fe', borderColor: '#3730a3', iconColor: '#c4b5fd' },
        navbar: { backgroundColor: '#020617', foregroundColor: '#0b0521', textColor: '#ede9fe', borderColor: '#1e1b4b', accentColor: '#c4b5fd', iconColor: '#a78bfa' },
        footer: { backgroundColor: '#020617', foregroundColor: '#0b0521', textColor: '#7c3aed', borderColor: '#1e1b4b', accentColor: '#c4b5fd', iconColor: '#6d28d9' },
      },
    },
  },
  {
    id: 'earth-harvest',
    label: 'Earth Harvest',
    description: 'Coklat-hijau bumi — cocok untuk tema agrikultur.',
    slots: {
      light: {
        dashboard: { accentColor: '#4d7c0f', backgroundColor: '#f7fee7', foregroundColor: '#ffffff', textColor: '#1a2e05', borderColor: '#bef264', iconColor: '#65a30d' },
        navbar: { backgroundColor: '#1a2e05', foregroundColor: '#365314', textColor: '#ecfccb', borderColor: '#365314', accentColor: '#a3e635', iconColor: '#d9f99d' },
        footer: { backgroundColor: '#1a2e05', foregroundColor: '#365314', textColor: '#a3e635', borderColor: '#365314', accentColor: '#a3e635', iconColor: '#84cc16' },
      },
      dark: {
        dashboard: { accentColor: '#a3e635', backgroundColor: '#0a1501', foregroundColor: '#1a2e05', textColor: '#ecfccb', borderColor: '#365314', iconColor: '#bef264' },
        navbar: { backgroundColor: '#020617', foregroundColor: '#0a1501', textColor: '#ecfccb', borderColor: '#1a2e05', accentColor: '#bef264', iconColor: '#a3e635' },
        footer: { backgroundColor: '#020617', foregroundColor: '#0a1501', textColor: '#65a30d', borderColor: '#1a2e05', accentColor: '#bef264', iconColor: '#4d7c0f' },
      },
    },
  },
];

const EMPTY_FORM: FormDraft = {
  code: '',
  name: '',
  type: 'seasonal',
  is_active: true,
  token_json: {
    light: { ...EMPTY_TOKEN_MODES.light },
    dark: { ...EMPTY_TOKEN_MODES.dark },
  },
  asset_manifest_json: {
    light: { ...EMPTY_ASSET_MODES.light },
    dark: { ...EMPTY_ASSET_MODES.dark },
  },
  app_ui_slots: {
    light: {},
    dark: {},
  },
};

const mapTokenValues = (
  raw: unknown,
  fallback: ThemeTokenFields
): ThemeTokenFields => {
  const source = asRecord(raw);
  return {
    accentColor:
      typeof source.accentColor === 'string'
        ? source.accentColor
        : fallback.accentColor,
    accentSoftColor:
      typeof source.accentSoftColor === 'string'
        ? source.accentSoftColor
        : fallback.accentSoftColor,
    loginCardBorder:
      typeof source.loginCardBorder === 'string'
        ? source.loginCardBorder
        : fallback.loginCardBorder,
  };
};

const mapAssetValues = (
  raw: unknown,
  fallback: ThemeAssetFields
): ThemeAssetFields => {
  const source = asRecord(raw);
  return {
    backgroundImage:
      typeof source.backgroundImage === 'string'
        ? source.backgroundImage
        : fallback.backgroundImage,
    illustration:
      typeof source.illustration === 'string'
        ? source.illustration
        : fallback.illustration,
    iconPack:
      typeof source.iconPack === 'string' ? source.iconPack : fallback.iconPack,
    accentAsset:
      typeof source.accentAsset === 'string'
        ? source.accentAsset
        : fallback.accentAsset,
  };
};

const mapTokenModes = (value?: ThemeTokenConfig): ThemeModesDraft<ThemeTokenFields> => {
  const source = asRecord(value);
  const topLevel = mapTokenValues(source, EMPTY_TOKEN_MODES.light);
  const modeSource = asRecord(source.modes);

  const hasModeLight = typeof modeSource.light !== 'undefined';
  const hasModeDark = typeof modeSource.dark !== 'undefined';
  const light = hasModeLight ? mapTokenValues(modeSource.light, topLevel) : topLevel;
  const dark = hasModeDark ? mapTokenValues(modeSource.dark, light) : light;

  return {
    light,
    dark,
  };
};

const mapAssetModes = (value?: ThemeAssetManifest): ThemeModesDraft<ThemeAssetFields> => {
  const source = asRecord(value);
  const topLevel = mapAssetValues(source, EMPTY_ASSET_MODES.light);
  const modeSource = asRecord(source.modes);

  const hasModeLight = typeof modeSource.light !== 'undefined';
  const hasModeDark = typeof modeSource.dark !== 'undefined';
  const light = hasModeLight ? mapAssetValues(modeSource.light, topLevel) : topLevel;
  const dark = hasModeDark ? mapAssetValues(modeSource.dark, light) : light;

  return {
    light,
    dark,
  };
};

const mapAppUiSlotModes = (value?: ThemeAssetManifest): ThemeModesDraft<ThemeAppUiSlots> => {
  const source = asRecord(value);
  const topLevelAppUi = mapAppUiSlots(source.app_ui as ThemeAppUiSlots | undefined);
  const modeSource = asRecord(source.modes);

  const lightMode = asRecord(modeSource.light);
  const darkMode = asRecord(modeSource.dark);

  const lightAppUi = typeof lightMode.app_ui !== 'undefined'
    ? mapAppUiSlots(lightMode.app_ui as ThemeAppUiSlots | undefined)
    : topLevelAppUi;
  const darkAppUi = typeof darkMode.app_ui !== 'undefined'
    ? mapAppUiSlots(darkMode.app_ui as ThemeAppUiSlots | undefined)
    : lightAppUi;

  return {
    light: lightAppUi,
    dark: darkAppUi,
  };
};

const sanitizeAssetValues = (value: ThemeAssetFields): ThemeAssetFields => ({
  backgroundImage: value.backgroundImage.trim(),
  illustration: value.illustration.trim(),
  iconPack: value.iconPack.trim(),
  accentAsset: value.accentAsset.trim(),
});

export function ThemeMasterFormSheet({
  open,
  mode,
  theme,
  iconPackOptions,
  accentAssetOptions,
  onOpenChange,
  onSubmit,
}: ThemeMasterFormSheetProps) {
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [activeMode, setActiveMode] = useState<ThemeMode>('light');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assetFeedback, setAssetFeedback] = useState<
    Record<ThemeMode, Record<AssetFieldKey, AssetFieldFeedback>>
  >({ light: { ...EMPTY_ASSET_FEEDBACK }, dark: { ...EMPTY_ASSET_FEEDBACK } });
  const [assetUploading, setAssetUploading] = useState<
    Record<ThemeMode, Record<AssetFieldKey, boolean>>
  >({ light: { ...EMPTY_ASSET_UPLOADING }, dark: { ...EMPTY_ASSET_UPLOADING } });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && theme) {
      setForm({
        code: theme.code,
        name: theme.name,
        type: theme.type,
        is_active: theme.is_active,
        token_json: mapTokenModes(theme.token_json),
        asset_manifest_json: mapAssetModes(theme.asset_manifest_json),
        app_ui_slots: mapAppUiSlotModes(theme.asset_manifest_json),
      });
      setActiveMode('light');
      setErrors({});
      setSubmitError(null);
      setAssetFeedback({ light: { ...EMPTY_ASSET_FEEDBACK }, dark: { ...EMPTY_ASSET_FEEDBACK } });
      setAssetUploading({ light: { ...EMPTY_ASSET_UPLOADING }, dark: { ...EMPTY_ASSET_UPLOADING } });
      return;
    }

    setForm({
      ...EMPTY_FORM,
      token_json: {
        light: { ...EMPTY_TOKEN_MODES.light },
        dark: { ...EMPTY_TOKEN_MODES.dark },
      },
      asset_manifest_json: {
        light: { ...EMPTY_ASSET_MODES.light },
        dark: { ...EMPTY_ASSET_MODES.dark },
      },
      app_ui_slots: { light: {}, dark: {} },
    });
    setActiveMode('light');
    setErrors({});
    setSubmitError(null);
    setAssetFeedback({ light: { ...EMPTY_ASSET_FEEDBACK }, dark: { ...EMPTY_ASSET_FEEDBACK } });
    setAssetUploading({ light: { ...EMPTY_ASSET_UPLOADING }, dark: { ...EMPTY_ASSET_UPLOADING } });
  }, [mode, open, theme]);

  const updateField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateTokenField = (
    modeKey: ThemeMode,
    key: keyof ThemeTokenFields,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      token_json: {
        ...current.token_json,
        [modeKey]: {
          ...current.token_json[modeKey],
          [key]: value,
        },
      },
    }));
  };

  const updateAssetField = (
    modeKey: ThemeMode,
    key: keyof ThemeAssetFields,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      asset_manifest_json: {
        ...current.asset_manifest_json,
        [modeKey]: {
          ...current.asset_manifest_json[modeKey],
          [key]: value,
        },
      },
    }));
  };

  const updateAppUiSlotField = (
    modeKey: ThemeMode,
    slotKey: AppUiSlotKey,
    fieldKey: AppUiColorFieldKey,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      app_ui_slots: {
        ...current.app_ui_slots,
        [modeKey]: {
          ...current.app_ui_slots[modeKey],
          [slotKey]: {
            ...normalizeAppUiSlot(current.app_ui_slots[modeKey]?.[slotKey]),
            [fieldKey]: value,
          },
        },
      },
    }));
  };

  const handleAssetFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    modeKey: ThemeMode,
    key: AssetFieldKey
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const recommendation = WEB_RECOMMENDED_DIMENSIONS[key];
    setAssetFeedback((current) => ({
      ...current,
      [modeKey]: { ...current[modeKey], [key]: { error: '', warning: '' } },
    }));
    setAssetUploading((current) => ({
      ...current,
      [modeKey]: { ...current[modeKey], [key]: true },
    }));

    try {
      const optimized = await optimizeRasterImageForUpload(file, recommendation);
      const fileToUpload = optimized.file;
      const dimensions = await readImageDimensions(fileToUpload);
      let warningMessage = '';
      if (dimensions.width !== recommendation.width || dimensions.height !== recommendation.height) {
        warningMessage = `Ukuran terdeteksi ${dimensions.width}x${dimensions.height}px. Disarankan ${recommendation.width}x${recommendation.height}px.`;
      }
      if (optimized.note) {
        warningMessage = warningMessage ? `${optimized.note} ${warningMessage}` : optimized.note;
      }

      const uploaded = await ThemeCampaignApi.uploadAsset(fileToUpload, {
        platform: 'web',
        assetKey: key,
      });
      if (!uploaded.path?.trim()) {
        throw new Error('Upload gagal: path asset kosong.');
      }

      updateAssetField(modeKey, key, uploaded.path.trim());
      setAssetFeedback((current) => ({
        ...current,
        [modeKey]: { ...current[modeKey], [key]: { error: '', warning: warningMessage } },
      }));
    } catch (error: unknown) {
      setAssetFeedback((current) => ({
        ...current,
        [modeKey]: {
          ...current[modeKey],
          [key]: {
            error: error instanceof Error ? error.message : 'Upload asset gagal.',
            warning: '',
          },
        },
      }));
    } finally {
      setAssetUploading((current) => ({
        ...current,
        [modeKey]: { ...current[modeKey], [key]: false },
      }));
      event.target.value = '';
    }
  };

  const isAnyAssetUploading =
    assetUploading.light.backgroundImage ||
    assetUploading.light.illustration ||
    assetUploading.dark.backgroundImage ||
    assetUploading.dark.illustration;

  const applyColorPreset = (preset: ColorPreset) => {
    setForm((current) => ({
      ...current,
      token_json: {
        light: { ...preset.tokens.light },
        dark: { ...preset.tokens.dark },
      },
    }));
  };

  const applyAppUiColorPreset = (preset: AppUiColorPreset) => {
    setForm((current) => ({
      ...current,
      app_ui_slots: {
        light: mapAppUiSlots(preset.slots.light),
        dark: mapAppUiSlots(preset.slots.dark),
      },
    }));
  };

  const validate = (): ThemeModesDraft<ThemeTokenFields> | null => {
    const nextErrors: Record<string, string> = {};
    const normalizedByMode: ThemeModesDraft<ThemeTokenFields> = {
      light: { ...EMPTY_TOKEN_MODES.light },
      dark: { ...EMPTY_TOKEN_MODES.dark },
    };

    if (!form.code.trim()) nextErrors.code = 'code wajib diisi.';
    if (!form.name.trim()) nextErrors.name = 'name wajib diisi.';
    if (!form.type) nextErrors.type = 'type wajib dipilih.';

    for (const modeKey of THEME_MODES) {
      const tokenValue = form.token_json[modeKey];
      const normalizedAccentColor = normalizeHexColor(tokenValue.accentColor);
      const normalizedAccentSoftColor = normalizeHexColor(tokenValue.accentSoftColor);
      const normalizedLoginCardBorder = normalizeHexColor(tokenValue.loginCardBorder);

      if (!normalizedAccentColor) {
        nextErrors[`${modeKey}_token_accentColor`] = `${modeKey}.accentColor harus HEX valid (contoh: #0f766e).`;
      }
      if (!normalizedAccentSoftColor) {
        nextErrors[`${modeKey}_token_accentSoftColor`] =
          `${modeKey}.accentSoftColor harus HEX valid (contoh: #ccfbf1).`;
      }
      if (!normalizedLoginCardBorder) {
        nextErrors[`${modeKey}_token_loginCardBorder`] =
          `${modeKey}.loginCardBorder harus HEX valid (contoh: #2dd4bf).`;
      }

      normalizedByMode[modeKey] = {
        accentColor: normalizedAccentColor || tokenValue.accentColor,
        accentSoftColor: normalizedAccentSoftColor || tokenValue.accentSoftColor,
        loginCardBorder: normalizedLoginCardBorder || tokenValue.loginCardBorder,
      };
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return normalizedByMode;
  };

  const handleSubmit = async () => {
    if (isAnyAssetUploading) return;
    const normalizedTokens = validate();
    if (!normalizedTokens) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const lightAssets = sanitizeAssetValues(form.asset_manifest_json.light);
    const darkAssets = sanitizeAssetValues(form.asset_manifest_json.dark);

    const lightAppUi = mapAppUiSlots(form.app_ui_slots.light);
    const darkAppUi = mapAppUiSlots(form.app_ui_slots.dark);

    const payload: ThemeMasterFormValues = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      is_active: form.is_active,
      token_json: {
        ...normalizedTokens.light,
        modes: {
          light: { ...normalizedTokens.light },
          dark: { ...normalizedTokens.dark },
        },
      },
      asset_manifest_json: {
        ...lightAssets,
        app_ui: lightAppUi,
        modes: {
          light: { ...lightAssets, app_ui: lightAppUi },
          dark: { ...darkAssets, app_ui: darkAppUi },
        },
      },
    };

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Gagal menyimpan tema');
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedIconPackOptions =
    iconPackOptions.length > 0
      ? Array.from(new Set(iconPackOptions))
      : ['outline-enterprise'];
  const normalizedAccentAssetOptions =
    accentAssetOptions.length > 0
      ? Array.from(new Set(accentAssetOptions))
      : ['none'];

  const activeTokens = form.token_json[activeMode];
  const activeAssets = form.asset_manifest_json[activeMode];
  const activeAppUiSlots = form.app_ui_slots[activeMode];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Tambah Theme Master' : 'Ubah Theme Master'}</SheetTitle>
          <SheetDescription>
            Kelola definisi tema dasar/musiman dan token visual global.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-4">
            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Informasi Dasar</h3>
              <div className="space-y-2">
                <Label htmlFor="theme_code">code *</Label>
                <Input
                  id="theme_code"
                  value={form.code}
                  onChange={(event) => updateField('code', event.target.value)}
                  placeholder="seasonal-lebaran-2026"
                />
                {errors.code ? <p className="text-xs text-destructive">{errors.code}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme_name">name *</Label>
                <Input
                  id="theme_name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Lebaran Ceria 2026"
                />
                {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme_type">type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: 'base' | 'seasonal') =>
                      updateField('type', value)
                    }
                  >
                    <SelectTrigger id="theme_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">base</SelectItem>
                      <SelectItem value="seasonal">seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type ? <p className="text-xs text-destructive">{errors.type}</p> : null}
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <Label htmlFor="theme_active">is_active</Label>
                  <Switch
                    id="theme_active"
                    checked={form.is_active}
                    onCheckedChange={(value) => updateField('is_active', value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-2">
                <h3 className="font-medium">Varian Mode</h3>
                <p className="text-xs text-muted-foreground">
                  Setiap Theme Master menyimpan kombinasi Light dan Dark agar runtime konsisten.
                </p>
              </div>
              <Tabs
                value={activeMode}
                onValueChange={(value) => setActiveMode(value as ThemeMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="dark">Dark</TabsTrigger>
                </TabsList>
              </Tabs>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Preset Kombinasi Warna</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60"
                    onClick={() => applyColorPreset(preset)}
                  >
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>L</span>
                      <ColorSwatch color={preset.tokens.light.accentColor} />
                      <ColorSwatch color={preset.tokens.light.accentSoftColor} />
                      <ColorSwatch color={preset.tokens.light.loginCardBorder} />
                      <span className="ml-2">D</span>
                      <ColorSwatch color={preset.tokens.dark.accentColor} />
                      <ColorSwatch color={preset.tokens.dark.accentSoftColor} />
                      <ColorSwatch color={preset.tokens.dark.loginCardBorder} />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Token Warna ({activeMode})</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <TokenColorField
                  id={`token_${activeMode}_accent`}
                  label="accentColor"
                  value={activeTokens.accentColor}
                  fallback={EMPTY_TOKEN_MODES[activeMode].accentColor}
                  error={errors[`${activeMode}_token_accentColor`]}
                  onTextChange={(value) =>
                    updateTokenField(activeMode, 'accentColor', value)
                  }
                  onColorChange={(value) =>
                    updateTokenField(activeMode, 'accentColor', value)
                  }
                />
                <TokenColorField
                  id={`token_${activeMode}_soft`}
                  label="accentSoftColor"
                  value={activeTokens.accentSoftColor}
                  fallback={EMPTY_TOKEN_MODES[activeMode].accentSoftColor}
                  error={errors[`${activeMode}_token_accentSoftColor`]}
                  onTextChange={(value) =>
                    updateTokenField(activeMode, 'accentSoftColor', value)
                  }
                  onColorChange={(value) =>
                    updateTokenField(activeMode, 'accentSoftColor', value)
                  }
                />
                <TokenColorField
                  id={`token_${activeMode}_border`}
                  label="loginCardBorder"
                  value={activeTokens.loginCardBorder}
                  fallback={EMPTY_TOKEN_MODES[activeMode].loginCardBorder}
                  error={errors[`${activeMode}_token_loginCardBorder`]}
                  onTextChange={(value) =>
                    updateTokenField(activeMode, 'loginCardBorder', value)
                  }
                  onColorChange={(value) =>
                    updateTokenField(activeMode, 'loginCardBorder', value)
                  }
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-medium">Asset Manifest ({activeMode})</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`asset_bg_upload_${activeMode}`}>unggah / pratinjau gambar latar</Label>
                  <p className="text-[11px] text-muted-foreground">
                    `backgroundImage` • maks {MAX_UPLOAD_SIZE_LABEL} • saran{' '}
                    {WEB_RECOMMENDED_DIMENSIONS.backgroundImage.width}x
                    {WEB_RECOMMENDED_DIMENSIONS.backgroundImage.height}px
                  </p>
                  <Input
                    id={`asset_bg_upload_${activeMode}`}
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleAssetFileChange(event, activeMode, 'backgroundImage')}
                    disabled={assetUploading[activeMode].backgroundImage}
                  />
                  {assetUploading[activeMode].backgroundImage ? (
                    <p className="text-xs text-muted-foreground">Mengunggah asset...</p>
                  ) : null}
                  {assetFeedback[activeMode].backgroundImage.error ? (
                    <p className="text-xs text-destructive">{assetFeedback[activeMode].backgroundImage.error}</p>
                  ) : null}
                  {!assetFeedback[activeMode].backgroundImage.error && assetFeedback[activeMode].backgroundImage.warning ? (
                    <p className="text-xs text-amber-600">{assetFeedback[activeMode].backgroundImage.warning}</p>
                  ) : null}
                  <div className="relative h-28 overflow-hidden rounded-lg border bg-card">
                    {activeAssets.backgroundImage ? (
                      <NextImage
                        src={activeAssets.backgroundImage}
                        alt={`${activeMode} background preview`}
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
                  <Input
                    id={`asset_bg_${activeMode}`}
                    value={activeAssets.backgroundImage}
                    onChange={(event) =>
                      updateAssetField(activeMode, 'backgroundImage', event.target.value)
                    }
                    placeholder="https://... atau path hasil upload"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`asset_illustration_upload_${activeMode}`}>unggah / pratinjau ilustrasi</Label>
                  <p className="text-[11px] text-muted-foreground">
                    `illustration` • maks {MAX_UPLOAD_SIZE_LABEL} • saran{' '}
                    {WEB_RECOMMENDED_DIMENSIONS.illustration.width}x
                    {WEB_RECOMMENDED_DIMENSIONS.illustration.height}px
                  </p>
                  <Input
                    id={`asset_illustration_upload_${activeMode}`}
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleAssetFileChange(event, activeMode, 'illustration')}
                    disabled={assetUploading[activeMode].illustration}
                  />
                  {assetUploading[activeMode].illustration ? (
                    <p className="text-xs text-muted-foreground">Mengunggah asset...</p>
                  ) : null}
                  {assetFeedback[activeMode].illustration.error ? (
                    <p className="text-xs text-destructive">{assetFeedback[activeMode].illustration.error}</p>
                  ) : null}
                  {!assetFeedback[activeMode].illustration.error && assetFeedback[activeMode].illustration.warning ? (
                    <p className="text-xs text-amber-600">{assetFeedback[activeMode].illustration.warning}</p>
                  ) : null}
                  <div className="relative h-28 overflow-hidden rounded-lg border bg-card">
                    {activeAssets.illustration ? (
                      <NextImage
                        src={activeAssets.illustration}
                        alt={`${activeMode} illustration preview`}
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
                  <Input
                    id={`asset_illustration_${activeMode}`}
                    value={activeAssets.illustration}
                    onChange={(event) =>
                      updateAssetField(activeMode, 'illustration', event.target.value)
                    }
                    placeholder="https://... atau path hasil upload"
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`asset_icon_pack_${activeMode}`}>iconPack</Label>
                  <Select
                    value={activeAssets.iconPack}
                    onValueChange={(value) => updateAssetField(activeMode, 'iconPack', value)}
                  >
                    <SelectTrigger id={`asset_icon_pack_${activeMode}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedIconPackOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`asset_accent_${activeMode}`}>accentAsset</Label>
                  <Select
                    value={activeAssets.accentAsset}
                    onValueChange={(value) =>
                      updateAssetField(activeMode, 'accentAsset', value)
                    }
                  >
                    <SelectTrigger id={`asset_accent_${activeMode}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedAccentAssetOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-2">
                <h3 className="font-medium">App UI Slot Colors ({activeMode})</h3>
                <p className="text-xs text-muted-foreground">
                  Warna per-slot untuk mobile app UI (navbar, dashboard, footer, dll). Campaign dapat override asset per slot.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Preset Slot Colors</h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {APP_UI_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60"
                      onClick={() => applyAppUiColorPreset(preset)}
                    >
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {(['dashboard', 'navbar', 'footer'] as const).map((slotKey) => {
                          const lightSlot = preset.slots.light[slotKey];
                          return (
                            <span key={slotKey} className="flex items-center gap-0.5">
                              {lightSlot?.accentColor ? <ColorSwatch color={lightSlot.accentColor} /> : null}
                              {lightSlot?.backgroundColor ? <ColorSwatch color={lightSlot.backgroundColor} /> : null}
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {APP_UI_SLOT_CONFIG.map((slot) => {
                  const slotValue = normalizeAppUiSlot(activeAppUiSlots?.[slot.key]);
                  return (
                    <div key={slot.key} className="space-y-2 rounded-lg border bg-card/50 p-3">
                      <div>
                        <p className="text-sm font-medium">{slot.label}</p>
                        <p className="text-xs text-muted-foreground">{slot.description}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {APP_UI_COLOR_FIELD_KEYS.map((fieldKey) => {
                          const fieldValue = slotValue[fieldKey] || '';
                          return (
                            <div key={fieldKey} className="space-y-1">
                              <Label
                                htmlFor={`appui_${activeMode}_${slot.key}_${fieldKey}`}
                                className="text-xs"
                              >
                                {fieldKey}
                              </Label>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-7 w-7 shrink-0 rounded border"
                                  style={{
                                    backgroundColor: getColorPickerValue(fieldValue, '#0f172a'),
                                  }}
                                  aria-hidden="true"
                                />
                                <Input
                                  id={`appui_${activeMode}_${slot.key}_${fieldKey}`}
                                  value={fieldValue}
                                  onChange={(event) =>
                                    updateAppUiSlotField(
                                      activeMode,
                                      slot.key,
                                      fieldKey,
                                      event.target.value
                                    )
                                  }
                                  placeholder="#000000"
                                  className="h-8 font-mono text-xs"
                                />
                                <Input
                                  type="color"
                                  value={getColorPickerValue(fieldValue, '#0f172a')}
                                  onChange={(event) =>
                                    updateAppUiSlotField(
                                      activeMode,
                                      slot.key,
                                      fieldKey,
                                      event.target.value
                                    )
                                  }
                                  className="h-8 w-10 shrink-0 cursor-pointer p-0.5"
                                  aria-label={`${slot.label} ${fieldKey} color picker`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator />
            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !!isAnyAssetUploading}>
            {isAnyAssetUploading ? 'Mengunggah...' : isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Buat Theme' : 'Simpan Perubahan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface TokenColorFieldProps {
  id: string;
  label: string;
  value: string;
  fallback: string;
  error?: string;
  onTextChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

function TokenColorField({
  id,
  label,
  value,
  fallback,
  error,
  onTextChange,
  onColorChange,
}: TokenColorFieldProps) {
  const colorValue = getColorPickerValue(value, fallback);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <span
          className="h-9 w-9 rounded-md border"
          style={{ backgroundColor: colorValue }}
          aria-hidden="true"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={fallback}
          className="font-mono"
        />
        <Input
          id={`${id}_picker`}
          type="color"
          value={colorValue}
          onChange={(event) => onColorChange(event.target.value)}
          className="h-9 w-12 cursor-pointer p-1"
          aria-label={`${label} color picker`}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface ColorSwatchProps {
  color: string;
}

function ColorSwatch({ color }: ColorSwatchProps) {
  return (
    <span
      className="h-3 w-3 rounded-full border"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}
