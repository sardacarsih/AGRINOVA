'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';

interface RuntimeThemeCampaignInfo {
  campaign_name?: string;
}

interface RuntimeThemeSemanticColors {
  bg: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  mutedText: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  border: string;
  focus: string;
  danger: string;
}

interface RuntimeThemeSemanticRadius {
  sm: number;
  md: number;
  lg: number;
}

interface RuntimeThemeSemanticFontScale {
  body: number;
  small: number;
  legal: number;
}

interface RuntimeThemeSemanticAssets {
  bgPatternUrl: string;
  heroIllustrationUrl: string;
}

interface RuntimeThemeSemanticConfig {
  themeName: string;
  version: number;
  updatedAt: string;
  colors: RuntimeThemeSemanticColors;
  radius: RuntimeThemeSemanticRadius;
  fontScale: RuntimeThemeSemanticFontScale;
  assets: RuntimeThemeSemanticAssets;
}

interface RuntimeThemeState {
  source: string;
  kill_switch_enabled: boolean;
  applied_mode: string;
  mode_allowed: boolean;
  token_json: Record<string, unknown>;
  asset_manifest_json: Record<string, unknown>;
  campaign?: RuntimeThemeCampaignInfo | null;
  semantic: RuntimeThemeSemanticConfig;
  accent_soft_color: string;
}

interface RuntimeThemeOptions {
  platform: 'web' | 'mobile';
  mode?: 'light' | 'dark';
}

type AnyRecord = Record<string, unknown>;
type RuntimeMode = 'light' | 'dark' | '';

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_500;
const MAX_FETCH_ATTEMPTS = 2;
const STORAGE_KEY_PREFIX = 'agrinova:login-runtime-theme:v2';
const HEX_COLOR_REGEX = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

const DEFAULT_SEMANTIC_COLORS: RuntimeThemeSemanticColors = {
  bg: '#4f8b5d',
  surface: '#f7faf8',
  surfaceStrong: '#ffffff',
  text: '#1d2b24',
  mutedText: '#5f7368',
  primary: '#2aa866',
  primaryForeground: '#ffffff',
  accent: '#d4a63d',
  border: '#d6e2da',
  focus: '#2aa866',
  danger: '#c53a3a',
};

const DEFAULT_RADIUS: RuntimeThemeSemanticRadius = {
  sm: 10,
  md: 12,
  lg: 14,
};

const DEFAULT_FONT_SCALE: RuntimeThemeSemanticFontScale = {
  body: 16,
  small: 14,
  legal: 12,
};

const DEFAULT_ASSETS: RuntimeThemeSemanticAssets = {
  bgPatternUrl: '',
  heroIllustrationUrl: '',
};

const FALLBACK_RUNTIME_THEME: RuntimeThemeState = {
  source: 'BASE_THEME',
  kill_switch_enabled: false,
  applied_mode: '',
  mode_allowed: true,
  token_json: {
    accentColor: DEFAULT_SEMANTIC_COLORS.primary,
    accentSoftColor: '#d1fae5',
    loginCardBorder: DEFAULT_SEMANTIC_COLORS.border,
  },
  asset_manifest_json: {
    backgroundImage: '',
    illustration: '',
    iconPack: 'outline-enterprise',
    accentAsset: 'none',
  },
  campaign: null,
  semantic: {
    themeName: 'default-login',
    version: 1,
    updatedAt: '',
    colors: DEFAULT_SEMANTIC_COLORS,
    radius: DEFAULT_RADIUS,
    fontScale: DEFAULT_FONT_SCALE,
    assets: DEFAULT_ASSETS,
  },
  accent_soft_color: '#d1fae5',
};

interface CachedRuntimeTheme {
  expiresAt: number;
  etag: string | null;
  value: RuntimeThemeState;
}

const asRecord = (value: unknown): AnyRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as AnyRecord;
};

const readString = (record: AnyRecord | null, key: string): string => {
  if (!record) return '';
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
};

const readNumber = (record: AnyRecord | null, key: string): number | null => {
  if (!record) return null;
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeRuntimeMode = (value: unknown): RuntimeMode => {
  if (typeof value !== 'string') return '';
  const lower = value.trim().toLowerCase();
  if (lower === 'light' || lower === 'dark') return lower;
  return '';
};

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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const value = normalized.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  if ([r, g, b].some((item) => Number.isNaN(item))) return null;
  return { r, g, b };
};

const srgbToLinear = (channel: number): number => {
  const normalized = channel / 255;
  if (normalized <= 0.03928) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const contrastRatio = (foreground: string, background: string): number => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return 0;

  const fgLuminance =
    0.2126 * srgbToLinear(fg.r) +
    0.7152 * srgbToLinear(fg.g) +
    0.0722 * srgbToLinear(fg.b);
  const bgLuminance =
    0.2126 * srgbToLinear(bg.r) +
    0.7152 * srgbToLinear(bg.g) +
    0.0722 * srgbToLinear(bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const chooseReadableTextColor = (background: string): string => {
  const whiteContrast = contrastRatio('#ffffff', background);
  const darkContrast = contrastRatio('#111827', background);
  return darkContrast >= whiteContrast ? '#111827' : '#ffffff';
};

const ensureMinContrast = (
  foreground: string,
  background: string,
  minRatio: number,
  fallback: string
): string => {
  const normalizedForeground = normalizeHexColor(foreground);
  const normalizedBackground = normalizeHexColor(background);
  const normalizedFallback = normalizeHexColor(fallback);

  if (!normalizedBackground) {
    return normalizedFallback || normalizedForeground || fallback;
  }

  if (
    normalizedForeground &&
    contrastRatio(normalizedForeground, normalizedBackground) >= minRatio
  ) {
    return normalizedForeground;
  }

  if (
    normalizedFallback &&
    contrastRatio(normalizedFallback, normalizedBackground) >= minRatio
  ) {
    return normalizedFallback;
  }

  const readable = chooseReadableTextColor(normalizedBackground);
  if (contrastRatio(readable, normalizedBackground) >= minRatio) {
    return readable;
  }

  return normalizedFallback || normalizedForeground || fallback;
};

const normalizeAssetUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '';

  if (/^(https?:\/\/|data:|blob:|\/)/i.test(value)) {
    return value;
  }

  return `/${value.replace(/^\.?\//, '')}`;
};

const applyModeVariant = (source: AnyRecord | null, mode: RuntimeMode): AnyRecord | null => {
  if (!source || !mode) return source;

  const modes = asRecord(source.modes);
  const modeVariant = asRecord(modes?.[mode]);
  if (!modeVariant) return source;

  const merged: AnyRecord = {
    ...source,
    ...modeVariant,
  };

  for (const platformKey of ['web', 'mobile'] as const) {
    const sourcePlatform = asRecord(source[platformKey]);
    const variantPlatform = asRecord(modeVariant[platformKey]);
    if (sourcePlatform || variantPlatform) {
      merged[platformKey] = {
        ...(sourcePlatform || {}),
        ...(variantPlatform || {}),
      };
    }
  }

  const sourceAppUi = asRecord(source.app_ui);
  const variantAppUi = asRecord(modeVariant.app_ui);
  if (sourceAppUi || variantAppUi) {
    merged.app_ui = {
      ...(sourceAppUi || {}),
      ...(variantAppUi || {}),
    };
  }

  return merged;
};

const extractTokenPayload = (root: AnyRecord, mode: RuntimeMode): AnyRecord => {
  const topLevel = asRecord(root.token_json);
  const topLevelMode = applyModeVariant(topLevel, mode);
  if (topLevelMode) return topLevelMode;

  const theme = asRecord(root.theme);
  const nested = asRecord(theme?.token_json);
  const nestedMode = applyModeVariant(nested, mode);
  if (nestedMode) return nestedMode;

  return FALLBACK_RUNTIME_THEME.token_json;
};

const extractAssetManifestPayload = (
  root: AnyRecord,
  platform: 'web' | 'mobile',
  mode: RuntimeMode
): AnyRecord => {
  const theme = asRecord(root.theme);

  const candidates = [
    asRecord(root.asset_manifest_json),
    asRecord(root.assets_json),
    asRecord(root.assets),
    asRecord(theme?.asset_manifest_json),
    asRecord(theme?.assets_json),
    asRecord(theme?.assets),
  ].filter((value): value is AnyRecord => Boolean(value));

  for (const candidate of candidates) {
    const modeCandidate = applyModeVariant(candidate, mode) || candidate;
    const platformAssets = asRecord(modeCandidate[platform]);
    const webAssets = asRecord(modeCandidate.web);
    const mobileAssets = asRecord(modeCandidate.mobile);
    const fallbackByPlatform = platform === 'web' ? mobileAssets : webAssets;

    const backgroundImage = normalizeAssetUrl(
      readString(platformAssets, 'backgroundImage') ||
        readString(modeCandidate, 'backgroundImage') ||
        readString(fallbackByPlatform, 'backgroundImage')
    );
    const illustration = normalizeAssetUrl(
      readString(platformAssets, 'illustration') ||
        readString(modeCandidate, 'illustration') ||
        readString(fallbackByPlatform, 'illustration')
    );
    const iconPack =
      readString(platformAssets, 'iconPack') ||
      readString(modeCandidate, 'iconPack') ||
      readString(fallbackByPlatform, 'iconPack');
    const accentAsset =
      readString(platformAssets, 'accentAsset') ||
      readString(modeCandidate, 'accentAsset') ||
      readString(fallbackByPlatform, 'accentAsset');

    if (backgroundImage || illustration || iconPack || accentAsset) {
      return {
        backgroundImage,
        illustration,
        iconPack,
        accentAsset,
      };
    }
  }

  return FALLBACK_RUNTIME_THEME.asset_manifest_json;
};

const pickHexColor = (
  aliases: string[],
  sources: Array<AnyRecord | null>,
  fallback: string
): string => {
  for (const source of sources) {
    if (!source) continue;
    for (const alias of aliases) {
      const value = normalizeHexColor(readString(source, alias));
      if (value) return value;
    }
  }

  return normalizeHexColor(fallback) || fallback;
};

const resolveSemanticConfig = (
  root: AnyRecord,
  tokenPayload: AnyRecord,
  assetPayload: AnyRecord
): {
  semantic: RuntimeThemeSemanticConfig;
  accentSoftColor: string;
} => {
  const topLevelColors = asRecord(root.colors);
  const tokenColors = asRecord(tokenPayload.colors);
  const themeColors = asRecord(asRecord(asRecord(root.theme)?.token_json)?.colors);
  const colorSources = [topLevelColors, tokenColors, themeColors];

  const legacyAccent = normalizeHexColor(readString(tokenPayload, 'accentColor')) || DEFAULT_SEMANTIC_COLORS.primary;
  const legacyAccentSoft = normalizeHexColor(readString(tokenPayload, 'accentSoftColor')) || '#d1fae5';
  const legacyBorder = normalizeHexColor(readString(tokenPayload, 'loginCardBorder')) || DEFAULT_SEMANTIC_COLORS.border;

  const primary = pickHexColor(['primary', 'primaryColor', 'brand', 'brandColor'], colorSources, legacyAccent);
  const surfaceStrong = pickHexColor(
    ['surfaceStrong', 'surfaceStrongColor', 'surfaceCard', 'card', 'cardColor'],
    colorSources,
    DEFAULT_SEMANTIC_COLORS.surfaceStrong
  );
  const surface = pickHexColor(['surface', 'surfaceColor', 'panel', 'panelColor'], colorSources, DEFAULT_SEMANTIC_COLORS.surface);
  const text = ensureMinContrast(
    pickHexColor(['text', 'textColor', 'foreground', 'foregroundColor'], colorSources, DEFAULT_SEMANTIC_COLORS.text),
    surfaceStrong,
    4.5,
    DEFAULT_SEMANTIC_COLORS.text
  );
  const mutedText = ensureMinContrast(
    pickHexColor(['mutedText', 'mutedTextColor', 'textMuted', 'muted'], colorSources, DEFAULT_SEMANTIC_COLORS.mutedText),
    surfaceStrong,
    4.5,
    DEFAULT_SEMANTIC_COLORS.mutedText
  );
  const accent = pickHexColor(['accent', 'accentColor', 'highlight', 'highlightColor'], colorSources, primary);
  const border = pickHexColor(['border', 'borderColor', 'outline', 'outlineColor'], colorSources, legacyBorder);
  const focus = ensureMinContrast(
    pickHexColor(['focus', 'focusColor', 'ring', 'ringColor'], colorSources, primary),
    surfaceStrong,
    3,
    primary
  );
  const danger = pickHexColor(['danger', 'dangerColor', 'error', 'errorColor'], colorSources, DEFAULT_SEMANTIC_COLORS.danger);
  const bg = pickHexColor(['bg', 'background', 'backgroundColor', 'pageBackground'], colorSources, DEFAULT_SEMANTIC_COLORS.bg);
  const accentSoftColor = pickHexColor(
    ['accentSoft', 'accentSoftColor', 'softAccent', 'primarySoft'],
    colorSources,
    legacyAccentSoft
  );

  const radiusRecord = asRecord(root.radius) || asRecord(tokenPayload.radius);
  const fontScaleRecord = asRecord(root.fontScale) || asRecord(tokenPayload.fontScale);
  const assetsRecord = asRecord(root.assets);

  const radius: RuntimeThemeSemanticRadius = {
    sm: clamp(readNumber(radiusRecord, 'sm') ?? DEFAULT_RADIUS.sm, 0, 32),
    md: clamp(readNumber(radiusRecord, 'md') ?? DEFAULT_RADIUS.md, 0, 32),
    lg: clamp(readNumber(radiusRecord, 'lg') ?? DEFAULT_RADIUS.lg, 0, 32),
  };

  const fontScale: RuntimeThemeSemanticFontScale = {
    body: clamp(readNumber(fontScaleRecord, 'body') ?? DEFAULT_FONT_SCALE.body, 12, 20),
    small: clamp(readNumber(fontScaleRecord, 'small') ?? DEFAULT_FONT_SCALE.small, 11, 18),
    legal: clamp(readNumber(fontScaleRecord, 'legal') ?? DEFAULT_FONT_SCALE.legal, 10, 16),
  };

  const themeRecord = asRecord(root.theme);
  const campaignRecord = asRecord(root.campaign);
  const assets: RuntimeThemeSemanticAssets = {
    bgPatternUrl:
      normalizeAssetUrl(
        readString(assetsRecord, 'bgPatternUrl') ||
          readString(assetsRecord, 'backgroundImage') ||
          readString(assetPayload, 'backgroundImage')
      ) || '',
    heroIllustrationUrl:
      normalizeAssetUrl(
        readString(assetsRecord, 'heroIllustrationUrl') ||
          readString(assetsRecord, 'illustration') ||
          readString(assetPayload, 'illustration')
      ) || '',
  };

  const semantic: RuntimeThemeSemanticConfig = {
    themeName:
      readString(root, 'themeName') ||
      readString(campaignRecord, 'campaign_name') ||
      readString(themeRecord, 'name') ||
      FALLBACK_RUNTIME_THEME.semantic.themeName,
    version: Math.max(
      1,
      Math.floor(
        readNumber(root, 'version') ??
          readNumber(themeRecord, 'version') ??
          FALLBACK_RUNTIME_THEME.semantic.version
      )
    ),
    updatedAt:
      readString(root, 'updatedAt') ||
      readString(root, 'updated_at') ||
      readString(themeRecord, 'updated_at') ||
      '',
    colors: {
      bg,
      surface,
      surfaceStrong,
      text,
      mutedText,
      primary,
      primaryForeground: chooseReadableTextColor(primary),
      accent,
      border,
      focus,
      danger,
    },
    radius,
    fontScale,
    assets,
  };

  return {
    semantic,
    accentSoftColor,
  };
};

const buildCacheKey = (options: RuntimeThemeOptions) =>
  `${STORAGE_KEY_PREFIX}:${options.platform}:${options.mode ?? 'auto'}`;

const normalizeThemePayload = (
  raw: unknown,
  platform: 'web' | 'mobile',
  requestedMode?: 'light' | 'dark'
): RuntimeThemeState => {
  const root = (asRecord(asRecord(raw)?.data) ?? asRecord(raw) ?? {}) as AnyRecord;
  const source = readString(root, 'source');
  const appliedMode = normalizeRuntimeMode(readString(root, 'applied_mode'));
  const requested = normalizeRuntimeMode(requestedMode || '');
  const effectiveMode = appliedMode || requested;
  const campaignRaw = asRecord(root.campaign);
  const tokenPayload = extractTokenPayload(root, effectiveMode);
  const assetManifestPayload = extractAssetManifestPayload(root, platform, effectiveMode);
  const semanticResult = resolveSemanticConfig(root, tokenPayload, assetManifestPayload);

  return {
    source: source || FALLBACK_RUNTIME_THEME.source,
    kill_switch_enabled: Boolean(root.kill_switch_enabled),
    applied_mode: effectiveMode || FALLBACK_RUNTIME_THEME.applied_mode,
    mode_allowed: root.mode_allowed !== false,
    token_json: tokenPayload,
    asset_manifest_json: assetManifestPayload,
    campaign: campaignRaw
      ? {
          campaign_name: readString(campaignRaw, 'campaign_name') || undefined,
        }
      : null,
    semantic: semanticResult.semantic,
    accent_soft_color: semanticResult.accentSoftColor,
  };
};

const readCache = (
  cacheKey: string,
  platform: 'web' | 'mobile',
  mode?: 'light' | 'dark'
): CachedRuntimeTheme | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedRuntimeTheme;
    if (!parsed || typeof parsed !== 'object' || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return {
      expiresAt: parsed.expiresAt,
      etag: typeof parsed.etag === 'string' ? parsed.etag : null,
      value: normalizeThemePayload(parsed.value, platform, mode),
    };
  } catch {
    return null;
  }
};

const writeCache = (cacheKey: string, value: RuntimeThemeState, etag: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    const payload: CachedRuntimeTheme = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      etag,
      value,
    };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
};

export function useRuntimeTheme(options: RuntimeThemeOptions) {
  const platform = options.platform;
  const mode = options.mode;
  const cacheKey = buildCacheKey(options);

  const [data, setData] = useState<RuntimeThemeState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const cachedEntry = readCache(cacheKey, platform, mode);
      const cachedTheme = cachedEntry?.value ?? null;

      if (cachedTheme && mounted) {
        setData(cachedTheme);
      }

      setIsLoading(true);
      setError(null);

      let lastError: unknown = null;
      for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const response = await ThemeCampaignApi.getRuntimeThemeWithMeta(
            {
              platform,
              mode,
            },
            {
              signal: controller.signal,
              ifNoneMatch: cachedEntry?.etag ?? undefined,
            }
          );

          if (!mounted) return;

          if (response.status === 304 && cachedTheme) {
            setData(cachedTheme);
            setIsLoading(false);
            return;
          }

          const normalized = normalizeThemePayload(response.data, platform, mode);
          setData(normalized);
          writeCache(cacheKey, normalized, response.etag);
          setIsLoading(false);
          return;
        } catch (err: unknown) {
          lastError = err;
          if (attempt < MAX_FETCH_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      if (!mounted) return;

      if (!cachedTheme) {
        setData(FALLBACK_RUNTIME_THEME);
      }

      setError(lastError instanceof Error ? lastError.message : 'Failed to load runtime theme');
      setIsLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [cacheKey, mode, platform]);

  const semantic = useMemo(
    () => data?.semantic ?? FALLBACK_RUNTIME_THEME.semantic,
    [data?.semantic]
  );

  const accentColor = useMemo(() => semantic.colors.accent, [semantic.colors.accent]);

  const accentSoftColor = useMemo(
    () => normalizeHexColor(data?.accent_soft_color || '') || FALLBACK_RUNTIME_THEME.accent_soft_color,
    [data?.accent_soft_color]
  );

  const cardBorderColor = useMemo(() => semantic.colors.border, [semantic.colors.border]);

  const backgroundImage = useMemo(
    () => semantic.assets.bgPatternUrl || '',
    [semantic.assets.bgPatternUrl]
  );

  const illustration = useMemo(
    () => semantic.assets.heroIllustrationUrl || '',
    [semantic.assets.heroIllustrationUrl]
  );

  const iconPack = useMemo(() => {
    const value = data?.asset_manifest_json?.iconPack;
    return typeof value === 'string' && value.trim() ? value : 'outline-enterprise';
  }, [data?.asset_manifest_json]);

  return {
    data,
    isLoading,
    error,
    accentColor,
    accentSoftColor,
    cardBorderColor,
    backgroundImage,
    illustration,
    iconPack,
    semantic,
  };
}
