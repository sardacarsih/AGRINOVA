'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';

interface RuntimeThemeState {
  source: string;
  kill_switch_enabled: boolean;
  applied_mode: string;
  mode_allowed: boolean;
  token_json: Record<string, unknown>;
  asset_manifest_json: Record<string, unknown>;
  campaign?: {
    campaign_name?: string;
  } | null;
}

interface RuntimeThemeOptions {
  platform: 'web' | 'mobile';
  mode?: 'light' | 'dark';
}

type AnyRecord = Record<string, unknown>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_500;
const MAX_FETCH_ATTEMPTS = 2;

const FALLBACK_RUNTIME_THEME: RuntimeThemeState = {
  source: 'BASE_THEME',
  kill_switch_enabled: false,
  applied_mode: '',
  mode_allowed: true,
  token_json: {
    accentColor: '#059669',
    accentSoftColor: '#d1fae5',
    loginCardBorder: '#34d399',
  },
  asset_manifest_json: {
    backgroundImage: '',
    illustration: '',
    iconPack: 'outline-enterprise',
    accentAsset: 'none',
  },
  campaign: null,
};

interface CachedRuntimeTheme {
  expiresAt: number;
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

const normalizeAssetUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '';

  if (/^(https?:\/\/|data:|blob:|\/)/i.test(value)) {
    return value;
  }

  return `/${value.replace(/^\.?\//, '')}`;
};

const extractTokenPayload = (root: AnyRecord): AnyRecord => {
  const topLevel = asRecord(root.token_json);
  if (topLevel) return topLevel;

  const theme = asRecord(root.theme);
  const nested = asRecord(theme?.token_json);
  if (nested) return nested;

  return FALLBACK_RUNTIME_THEME.token_json;
};

const extractAssetManifestPayload = (
  root: AnyRecord,
  platform: 'web' | 'mobile'
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
    const platformAssets = asRecord(candidate[platform]);
    const webAssets = asRecord(candidate.web);
    const mobileAssets = asRecord(candidate.mobile);
    const fallbackByPlatform = platform === 'web' ? mobileAssets : webAssets;

    const backgroundImage = normalizeAssetUrl(
      readString(platformAssets, 'backgroundImage') ||
        readString(candidate, 'backgroundImage') ||
        readString(fallbackByPlatform, 'backgroundImage')
    );
    const illustration = normalizeAssetUrl(
      readString(platformAssets, 'illustration') ||
        readString(candidate, 'illustration') ||
        readString(fallbackByPlatform, 'illustration')
    );
    const iconPack =
      readString(platformAssets, 'iconPack') ||
      readString(candidate, 'iconPack') ||
      readString(fallbackByPlatform, 'iconPack');
    const accentAsset =
      readString(platformAssets, 'accentAsset') ||
      readString(candidate, 'accentAsset') ||
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

const buildCacheKey = (options: RuntimeThemeOptions) =>
  `runtime_theme:${options.platform}:${options.mode ?? 'auto'}`;

const normalizeThemePayload = (
  raw: unknown,
  platform: 'web' | 'mobile'
): RuntimeThemeState => {
  const root = (asRecord(asRecord(raw)?.data) ?? asRecord(raw) ?? {}) as AnyRecord;
  const source = readString(root, 'source');
  const appliedMode = readString(root, 'applied_mode');
  const campaignRaw = asRecord(root.campaign);

  return {
    source: source || FALLBACK_RUNTIME_THEME.source,
    kill_switch_enabled: Boolean(root.kill_switch_enabled),
    applied_mode: appliedMode || FALLBACK_RUNTIME_THEME.applied_mode,
    mode_allowed: root.mode_allowed !== false,
    token_json: extractTokenPayload(root),
    asset_manifest_json: extractAssetManifestPayload(root, platform),
    campaign: campaignRaw
      ? {
          campaign_name: readString(campaignRaw, 'campaign_name') || undefined,
        }
      : null,
  };
};

const readCache = (
  cacheKey: string,
  platform: 'web' | 'mobile'
): RuntimeThemeState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedRuntimeTheme;
    if (!parsed || typeof parsed !== 'object' || Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return normalizeThemePayload(parsed.value, platform);
  } catch {
    return null;
  }
};

const writeCache = (cacheKey: string, value: RuntimeThemeState) => {
  if (typeof window === 'undefined') return;

  try {
    const payload: CachedRuntimeTheme = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
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
      const cached = readCache(cacheKey, platform);
      if (cached && mounted) {
        setData(cached);
      }

      setIsLoading(true);
      setError(null);

      let lastError: unknown = null;
      for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const response = await ThemeCampaignApi.getRuntimeTheme(
            {
              platform,
              mode,
            },
            { signal: controller.signal }
          );

          if (!mounted) return;

          const normalized = normalizeThemePayload(response, platform);
          setData(normalized);
          writeCache(cacheKey, normalized);
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

      if (!cached) {
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

  const accentColor = useMemo(() => {
    if (typeof data?.token_json?.accentColor === 'string' && data.token_json.accentColor.trim()) {
      return data.token_json.accentColor;
    }
    return '#059669';
  }, [data?.token_json]);

  const accentSoftColor = useMemo(() => {
    if (typeof data?.token_json?.accentSoftColor === 'string' && data.token_json.accentSoftColor.trim()) {
      return data.token_json.accentSoftColor;
    }
    return '#d1fae5';
  }, [data?.token_json]);

  const cardBorderColor = useMemo(() => {
    if (typeof data?.token_json?.loginCardBorder === 'string' && data.token_json.loginCardBorder.trim()) {
      return data.token_json.loginCardBorder;
    }
    return accentColor;
  }, [accentColor, data?.token_json]);

  const backgroundImage = useMemo(() => {
    const value = data?.asset_manifest_json?.backgroundImage;
    return typeof value === 'string' && value.trim() ? normalizeAssetUrl(value) : '';
  }, [data?.asset_manifest_json]);

  const illustration = useMemo(() => {
    const value = data?.asset_manifest_json?.illustration;
    return typeof value === 'string' && value.trim() ? normalizeAssetUrl(value) : '';
  }, [data?.asset_manifest_json]);

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
  };
}
