'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeCampaignApi } from '@/features/theme-campaigns/api/theme-campaign-api';
import {
  SortDirection,
  ThemeAuditLog,
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

const ensurePlatformAssets = (value: unknown) => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    backgroundImage:
      typeof source.backgroundImage === 'string' ? source.backgroundImage : '',
    illustration:
      typeof source.illustration === 'string' ? source.illustration : '',
    iconPack: typeof source.iconPack === 'string' ? source.iconPack : '',
    accentAsset: typeof source.accentAsset === 'string' ? source.accentAsset : '',
  };
};

const mapCampaignAssets = (assets: unknown): ThemeCampaignAssets => {
  const source = assets && typeof assets === 'object' ? (assets as Record<string, unknown>) : {};
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

const mapCampaign = (item: any): ThemeCampaign => ({
  id: item?.id || '',
  theme_id: item?.theme_id || '',
  campaign_group_key: item?.campaign_group_key || '',
  campaign_name: item?.campaign_name || '',
  description: item?.description || '',
  enabled: Boolean(item?.enabled),
  start_at: item?.start_at || undefined,
  end_at: item?.end_at || undefined,
  priority: Number(item?.priority || 0),
  light_mode_enabled: item?.light_mode_enabled !== false,
  dark_mode_enabled: item?.dark_mode_enabled !== false,
  assets: mapCampaignAssets(item?.assets),
  updated_by: item?.updated_by || '-',
  updated_at: item?.updated_at || new Date().toISOString(),
  status: item?.status,
});

const mapThemeTokenConfig = (value: unknown): ThemeTokenConfig => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result: ThemeTokenConfig = {
    accentColor: typeof source.accentColor === 'string' ? source.accentColor : '',
    accentSoftColor: typeof source.accentSoftColor === 'string' ? source.accentSoftColor : '',
    loginCardBorder: typeof source.loginCardBorder === 'string' ? source.loginCardBorder : '',
  };

  Object.entries(source).forEach(([key, candidate]) => {
    if (typeof candidate === 'string' && !(key in result)) {
      result[key] = candidate;
    }
  });

  return result;
};

const mapThemeAssetManifest = (value: unknown): ThemeAssetManifest => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    backgroundImage:
      typeof source.backgroundImage === 'string' ? source.backgroundImage : '',
    illustration:
      typeof source.illustration === 'string' ? source.illustration : '',
    iconPack: typeof source.iconPack === 'string' ? source.iconPack : 'outline-enterprise',
    accentAsset: typeof source.accentAsset === 'string' ? source.accentAsset : 'none',
  };
};

const mapTheme = (item: any): ThemeEntity => ({
  id: item?.id || '',
  code: item?.code || '',
  name: item?.name || '',
  type: item?.type === 'base' ? 'base' : 'seasonal',
  is_active: Boolean(item?.is_active),
  token_json: mapThemeTokenConfig(item?.token_json),
  asset_manifest_json: mapThemeAssetManifest(item?.asset_manifest_json),
});

const mapAudit = (item: any): ThemeAuditLog => ({
  id: item?.id || '',
  actor: item?.actor || '-',
  action: item?.action || '-',
  target_entity: item?.target_entity || '-',
  timestamp: item?.timestamp || new Date().toISOString(),
  before_summary: item?.before_summary || '-',
  after_summary: item?.after_summary || '-',
});

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
