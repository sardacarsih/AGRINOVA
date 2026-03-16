'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';
import {
  SortDirection,
  ThemeAuditLog,
  ThemeAppUiSlot,
  ThemeAppUiSlots,
  ThemeCampaign,
  ThemeCampaignAssets,
  ThemeCampaignFilters,
  ThemeCampaignFormValues,
  ThemeCampaignSortField,
  ThemeCampaignStats,
  ThemeCampaignStatus,
  ThemeMasterFormValues,
  ThemeSettings,
  ThemeTokenConfig,
  ThemeAssetManifest,
  ThemeEntity,
  resolveCampaignStatus,
} from '@/features/theme-campaigns/types/theme-campaign';

interface UseThemeCampaignDashboardResult {
  isLoading: boolean;
  error: string | null;
  campaigns: ThemeCampaign[];
  themes: ThemeEntity[];
  settings: ThemeSettings;
  auditLogs: ThemeAuditLog[];
  filters: ThemeCampaignFilters;
  sortField: ThemeCampaignSortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  totalPages: number;
  totalFiltered: number;
  paginatedCampaigns: ThemeCampaign[];
  stats: ThemeCampaignStats;
  activeCampaign: ThemeCampaign | null;
  setFilter: <K extends keyof ThemeCampaignFilters>(key: K, value: ThemeCampaignFilters[K]) => void;
  clearFilters: () => void;
  setPage: (nextPage: number) => void;
  setSort: (field: ThemeCampaignSortField) => void;
  refresh: () => Promise<void>;
  createCampaign: (values: ThemeCampaignFormValues) => Promise<ThemeCampaign | null>;
  updateCampaign: (id: string, values: ThemeCampaignFormValues) => Promise<ThemeCampaign | null>;
  createTheme: (values: ThemeMasterFormValues) => Promise<ThemeEntity | null>;
  updateTheme: (id: string, values: ThemeMasterFormValues) => Promise<ThemeEntity | null>;
  toggleThemeActive: (id: string) => Promise<ThemeEntity | null>;
  setDefaultTheme: (themeID: string) => Promise<boolean>;
  toggleCampaignEnabled: (id: string) => Promise<ThemeCampaign | null>;
  duplicateCampaign: (id: string) => Promise<ThemeCampaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  toggleKillSwitch: () => Promise<void>;
  availableVisualOptions: {
    iconPacks: string[];
    accentAssets: string[];
  };
  getStatus: (campaign: ThemeCampaign) => ThemeCampaignStatus;
}

const DEFAULT_FILTERS: ThemeCampaignFilters = {
  search: '',
  status: 'all',
};

const DEFAULT_SETTINGS: ThemeSettings = {
  default_theme_id: '',
  global_kill_switch: false,
};

const APP_UI_SLOT_KEYS = [
  'navbar',
  'sidebar',
  'footer',
  'dashboard',
  'notification_banner',
  'empty_state_illustration',
  'modal_accent',
] as const;

const THEME_CAMPAIGN_STATUS_VALUES: ThemeCampaignStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'EXPIRED',
  'DISABLED',
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asThemeCampaignStatus = (value: unknown): ThemeCampaignStatus | undefined =>
  typeof value === 'string' && THEME_CAMPAIGN_STATUS_VALUES.includes(value as ThemeCampaignStatus)
    ? (value as ThemeCampaignStatus)
    : undefined;

const ensureAppUiSlot = (value: unknown): ThemeAppUiSlot => {
  const source = asRecord(value);
  return {
    backgroundColor:
      typeof source.backgroundColor === 'string' ? source.backgroundColor : '',
    foregroundColor:
      typeof source.foregroundColor === 'string' ? source.foregroundColor : '',
    textColor: typeof source.textColor === 'string' ? source.textColor : '',
    borderColor: typeof source.borderColor === 'string' ? source.borderColor : '',
    accentColor: typeof source.accentColor === 'string' ? source.accentColor : '',
    iconColor: typeof source.iconColor === 'string' ? source.iconColor : '',
    asset: typeof source.asset === 'string' ? source.asset : '',
  };
};

const ensureAppUiSlots = (value: unknown): ThemeAppUiSlots => {
  const source = asRecord(value);
  return APP_UI_SLOT_KEYS.reduce<ThemeAppUiSlots>((acc, slotKey) => {
    acc[slotKey] = ensureAppUiSlot(source[slotKey]);
    return acc;
  }, {});
};

const ensurePlatformAssets = (value: unknown) => {
  const source = asRecord(value);
  return {
    backgroundImage:
      typeof source.backgroundImage === 'string' ? source.backgroundImage : '',
    illustration:
      typeof source.illustration === 'string' ? source.illustration : '',
    iconPack: typeof source.iconPack === 'string' ? source.iconPack : '',
    accentAsset: typeof source.accentAsset === 'string' ? source.accentAsset : '',
    app_ui: ensureAppUiSlots(source.app_ui),
  };
};

const mapCampaignAssets = (assets: unknown): ThemeCampaignAssets => {
  const source = asRecord(assets);
  const web = ensurePlatformAssets(source.web);
  const mobile = ensurePlatformAssets(source.mobile);

  if (!source.web && !source.mobile) {
    const fallback = ensurePlatformAssets(source);
    return {
      web: { ...fallback },
      mobile: { ...fallback },
    };
  }

  return {
    web,
    mobile,
  };
};

const mapCampaign = (item: unknown): ThemeCampaign => {
  const source = asRecord(item);
  return {
    id: asString(source.id),
    theme_id: asString(source.theme_id),
    campaign_group_key: asString(source.campaign_group_key),
    campaign_name: asString(source.campaign_name),
    description: asString(source.description),
    enabled: asBoolean(source.enabled),
    start_at: asOptionalString(source.start_at),
    end_at: asOptionalString(source.end_at),
    priority: asNumber(source.priority),
    light_mode_enabled: source.light_mode_enabled !== false,
    dark_mode_enabled: source.dark_mode_enabled !== false,
    assets: mapCampaignAssets(source.assets),
    updated_by: asString(source.updated_by, '-'),
    updated_at: asString(source.updated_at, new Date().toISOString()),
    status: asThemeCampaignStatus(source.status),
  };
};

const mapThemeTokenConfig = (value: unknown): ThemeTokenConfig => {
  const mapTokenValues = (raw: unknown, fallback?: ThemeTokenConfig): ThemeTokenConfig => {
    const source = asRecord(raw);
    const result: ThemeTokenConfig = {
      accentColor:
        typeof source.accentColor === 'string'
          ? source.accentColor
          : fallback?.accentColor || '',
      accentSoftColor:
        typeof source.accentSoftColor === 'string'
          ? source.accentSoftColor
          : fallback?.accentSoftColor || '',
      loginCardBorder:
        typeof source.loginCardBorder === 'string'
          ? source.loginCardBorder
          : fallback?.loginCardBorder || '',
    };

    Object.entries(source).forEach(([key, candidate]) => {
      if (key === 'modes' || key in result) return;
      if (typeof candidate === 'string') {
        result[key] = candidate;
      }
    });

    return result;
  };

  const source = asRecord(value);
  const base = mapTokenValues(source);
  const modeSource = asRecord(source.modes);
  const light = mapTokenValues(modeSource.light, base);
  const dark = mapTokenValues(modeSource.dark, base);

  return {
    ...base,
    modes: {
      light,
      dark,
    },
  };
};

const mapThemeAssetManifest = (value: unknown): ThemeAssetManifest => {
  const mapAssetValues = (
    raw: unknown,
    fallback?: ThemeAssetManifest
  ): ThemeAssetManifest => {
    const source = asRecord(raw);
    const result: ThemeAssetManifest = {
      backgroundImage:
        typeof source.backgroundImage === 'string'
          ? source.backgroundImage
          : fallback?.backgroundImage || '',
      illustration:
        typeof source.illustration === 'string'
          ? source.illustration
          : fallback?.illustration || '',
      iconPack:
        typeof source.iconPack === 'string'
          ? source.iconPack
          : fallback?.iconPack || 'outline-enterprise',
      accentAsset:
        typeof source.accentAsset === 'string'
          ? source.accentAsset
          : fallback?.accentAsset || 'none',
      app_ui: ensureAppUiSlots(source.app_ui ?? fallback?.app_ui),
    };

    if (source.web || fallback?.web) {
      result.web = ensurePlatformAssets(source.web ?? fallback?.web);
    }
    if (source.mobile || fallback?.mobile) {
      result.mobile = ensurePlatformAssets(source.mobile ?? fallback?.mobile);
    }

    return result;
  };

  const source = asRecord(value);
  const base = mapAssetValues(source);
  const modeSource = asRecord(source.modes);
  const light = mapAssetValues(modeSource.light, base);
  const dark = mapAssetValues(modeSource.dark, base);

  return {
    ...base,
    modes: {
      light,
      dark,
    },
  };
};

const mapTheme = (item: unknown): ThemeEntity => {
  const source = asRecord(item);
  return {
    id: asString(source.id),
    code: asString(source.code),
    name: asString(source.name),
    type: source.type === 'base' ? 'base' : 'seasonal',
    is_active: asBoolean(source.is_active),
    token_json: mapThemeTokenConfig(source.token_json),
    asset_manifest_json: mapThemeAssetManifest(source.asset_manifest_json),
  };
};

const mapAudit = (item: unknown): ThemeAuditLog => {
  const source = asRecord(item);
  return {
    id: asString(source.id),
    actor: asString(source.actor, '-'),
    action: asString(source.action, '-'),
    target_entity: asString(source.target_entity, '-'),
    timestamp: asString(source.timestamp, new Date().toISOString()),
    before_summary: asString(source.before_summary, '-'),
    after_summary: asString(source.after_summary, '-'),
  };
};

export function useThemeCampaignDashboard(): UseThemeCampaignDashboardResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<ThemeCampaign[]>([]);
  const [themes, setThemes] = useState<ThemeEntity[]>([]);
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<ThemeAuditLog[]>([]);
  const [filters, setFilters] = useState<ThemeCampaignFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<ThemeCampaignSortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [stats, setStats] = useState<ThemeCampaignStats>({
    total: 0,
    active: 0,
    scheduled: 0,
    killSwitchEnabled: false,
  });
  const [activeCampaign, setActiveCampaign] = useState<ThemeCampaign | null>(null);
  const [availableVisualOptions, setAvailableVisualOptions] = useState({
    iconPacks: [] as string[],
    accentAssets: [] as string[],
  });

  const getStatus = useCallback((campaign: ThemeCampaign) => {
    if (campaign.status) {
      return campaign.status;
    }
    return resolveCampaignStatus(campaign);
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ThemeCampaignApi.getDashboard({
        filters,
        sortField,
        sortDirection,
        page,
        pageSize,
      });

      const mappedCampaigns = Array.isArray(response.campaigns) ? response.campaigns.map(mapCampaign) : [];
      setCampaigns(mappedCampaigns);
      setThemes(Array.isArray(response.themes) ? response.themes.map(mapTheme) : []);
      setSettings({
        default_theme_id: response.settings?.default_theme_id || '',
        global_kill_switch: Boolean(response.settings?.global_kill_switch),
      });
      setAuditLogs(Array.isArray(response.audit_logs) ? response.audit_logs.map(mapAudit) : []);
      setTotalPages(Number(response.total_pages || 1));
      setTotalFiltered(Number(response.total_filtered || 0));
      setStats({
        total: Number(response.stats?.total || 0),
        active: Number(response.stats?.active || 0),
        scheduled: Number(response.stats?.scheduled || 0),
        killSwitchEnabled: Boolean(response.stats?.killSwitchEnabled),
      });
      setAvailableVisualOptions({
        iconPacks: Array.isArray(response.visual_options?.icon_packs)
          ? response.visual_options.icon_packs
          : [],
        accentAssets: Array.isArray(response.visual_options?.accent_assets)
          ? response.visual_options.accent_assets
          : [],
      });
      setActiveCampaign(response.active_campaign ? mapCampaign(response.active_campaign) : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data kampanye');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize, sortDirection, sortField]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const setFilter = useCallback(
    <K extends keyof ThemeCampaignFilters>(key: K, value: ThemeCampaignFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPageState(1);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPageState(1);
  }, []);

  const setSort = useCallback((field: ThemeCampaignSortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
        return currentField;
      }

      setSortDirection('asc');
      return field;
    });
  }, []);

  const setPage = useCallback((nextPage: number) => {
    if (nextPage < 1) return;
    setPageState(nextPage);
  }, []);

  const refresh = useCallback(async () => {
    await loadDashboard();
  }, [loadDashboard]);

  const createCampaign = useCallback(
    async (values: ThemeCampaignFormValues) => {
      try {
        const created = await ThemeCampaignApi.createCampaign(values);
        await loadDashboard();
        return mapCampaign(created);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal membuat kampanye');
        return null;
      }
    },
    [loadDashboard]
  );

  const updateCampaign = useCallback(
    async (id: string, values: ThemeCampaignFormValues) => {
      try {
        const updated = await ThemeCampaignApi.updateCampaign(id, values);
        await loadDashboard();
        return mapCampaign(updated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memperbarui kampanye');
        return null;
      }
    },
    [loadDashboard]
  );

  const createTheme = useCallback(
    async (values: ThemeMasterFormValues) => {
      try {
        const created = await ThemeCampaignApi.createTheme(values);
        await loadDashboard();
        return mapTheme(created);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal membuat tema');
        return null;
      }
    },
    [loadDashboard]
  );

  const updateTheme = useCallback(
    async (id: string, values: ThemeMasterFormValues) => {
      try {
        const updated = await ThemeCampaignApi.updateTheme(id, values);
        await loadDashboard();
        return mapTheme(updated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memperbarui tema');
        return null;
      }
    },
    [loadDashboard]
  );

  const toggleThemeActive = useCallback(
    async (id: string) => {
      try {
        const updated = await ThemeCampaignApi.toggleThemeActive(id);
        await loadDashboard();
        return mapTheme(updated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal mengubah status tema');
        return null;
      }
    },
    [loadDashboard]
  );

  const setDefaultTheme = useCallback(
    async (themeID: string) => {
      try {
        await ThemeCampaignApi.setDefaultTheme(themeID);
        await loadDashboard();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal mengubah default tema');
        return false;
      }
    },
    [loadDashboard]
  );

  const toggleCampaignEnabled = useCallback(
    async (id: string) => {
      try {
        const updated = await ThemeCampaignApi.toggleCampaignEnabled(id);
        await loadDashboard();
        return mapCampaign(updated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal mengubah status kampanye');
        return null;
      }
    },
    [loadDashboard]
  );

  const duplicateCampaign = useCallback(
    async (id: string) => {
      try {
        const duplicated = await ThemeCampaignApi.duplicateCampaign(id);
        await loadDashboard();
        return mapCampaign(duplicated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal menduplikasi kampanye');
        return null;
      }
    },
    [loadDashboard]
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      try {
        await ThemeCampaignApi.deleteCampaign(id);
        await loadDashboard();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal menghapus kampanye');
        return false;
      }
    },
    [loadDashboard]
  );

  const toggleKillSwitch = useCallback(async () => {
    try {
      await ThemeCampaignApi.setGlobalKillSwitch(!settings.global_kill_switch);
      await loadDashboard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah global kill switch');
    }
  }, [loadDashboard, settings.global_kill_switch]);

  const paginatedCampaigns = useMemo(() => campaigns, [campaigns]);

  return {
    isLoading,
    error,
    campaigns,
    themes,
    settings,
    auditLogs,
    filters,
    sortField,
    sortDirection,
    page,
    pageSize,
    totalPages,
    totalFiltered,
    paginatedCampaigns,
    stats,
    activeCampaign,
    setFilter,
    clearFilters,
    setPage,
    setSort,
    refresh,
    createCampaign,
    updateCampaign,
    createTheme,
    updateTheme,
    toggleThemeActive,
    setDefaultTheme,
    toggleCampaignEnabled,
    duplicateCampaign,
    deleteCampaign,
    toggleKillSwitch,
    availableVisualOptions,
    getStatus,
  };
}
