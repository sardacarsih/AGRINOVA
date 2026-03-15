import {
  SortDirection,
  ThemeCampaignFilters,
  ThemeCampaignFormValues,
  ThemeCampaignSortField,
  ThemeMasterFormValues,
} from '@/features/theme-campaigns/types/theme-campaign';

export interface ThemeCampaignDashboardResponse {
  campaigns: any[];
  themes: any[];
  settings: any;
  audit_logs: any[];
  total_filtered: number;
  total_pages: number;
  page: number;
  page_size: number;
  active_campaign?: any | null;
  stats: {
    total: number;
    active: number;
    scheduled: number;
    killSwitchEnabled: boolean;
  };
  visual_options: {
    icon_packs: string[];
    accent_assets: string[];
  };
}

export interface ThemeAssetUploadResponse {
  success: boolean;
  path: string;
  contentType: string;
  size: number;
  originalName: string;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body?.message || 'Request failed');
  }
  return body;
};

export class ThemeCampaignApi {
  static async getDashboard(params: {
    filters: ThemeCampaignFilters;
    sortField: ThemeCampaignSortField;
    sortDirection: SortDirection;
    page: number;
    pageSize: number;
  }): Promise<ThemeCampaignDashboardResponse> {
    const query = new URLSearchParams({
      search: params.filters.search || '',
      status: params.filters.status || 'all',
      sortField: params.sortField,
      sortDirection: params.sortDirection,
      page: String(params.page),
      pageSize: String(params.pageSize),
    });

    const response = await fetch(`/api/theme-campaigns?${query.toString()}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    return parseResponse<ThemeCampaignDashboardResponse>(response);
  }

  static async createCampaign(values: ThemeCampaignFormValues) {
    const response = await fetch('/api/theme-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    });
    return parseResponse<any>(response);
  }

  static async updateCampaign(id: string, values: ThemeCampaignFormValues) {
    const response = await fetch(`/api/theme-campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    });
    return parseResponse<any>(response);
  }

  static async toggleCampaignEnabled(id: string) {
    const response = await fetch(`/api/theme-campaigns/${id}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    return parseResponse<any>(response);
  }

  static async duplicateCampaign(id: string) {
    const response = await fetch(`/api/theme-campaigns/${id}/duplicate`, {
      method: 'POST',
      credentials: 'include',
    });
    return parseResponse<any>(response);
  }

  static async deleteCampaign(id: string) {
    const response = await fetch(`/api/theme-campaigns/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return parseResponse<{ deleted: boolean }>(response);
  }

  static async setGlobalKillSwitch(enabled: boolean) {
    const response = await fetch('/api/theme-campaigns/kill-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    return parseResponse<any>(response);
  }

  static async getThemes() {
    const response = await fetch('/api/theme-campaigns/themes', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseResponse<{ themes: any[] }>(response);
  }

  static async createTheme(values: ThemeMasterFormValues) {
    const response = await fetch('/api/theme-campaigns/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    });
    return parseResponse<any>(response);
  }

  static async updateTheme(id: string, values: ThemeMasterFormValues) {
    const response = await fetch(`/api/theme-campaigns/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    });
    return parseResponse<any>(response);
  }

  static async toggleThemeActive(id: string) {
    const response = await fetch(`/api/theme-campaigns/themes/${id}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    return parseResponse<any>(response);
  }

  static async setDefaultTheme(themeID: string) {
    const response = await fetch('/api/theme-campaigns/default-theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ theme_id: themeID }),
    });
    return parseResponse<any>(response);
  }

  static async uploadAsset(
    file: File,
    params: {
      platform: 'web' | 'mobile';
      assetKey: 'backgroundImage' | 'illustration';
    }
  ) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('platform', params.platform);
    formData.set('assetKey', params.assetKey);

    const response = await fetch('/api/theme-campaigns/assets/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    return parseResponse<ThemeAssetUploadResponse>(response);
  }

  static async getRuntimeTheme(
    params: { platform: string; mode?: 'light' | 'dark' },
    options?: { signal?: AbortSignal }
  ) {
    const query = new URLSearchParams({
      platform: params.platform,
    });
    if (params.mode) {
      query.set('mode', params.mode);
    }

    const response = await fetch(`/api/theme-campaigns/runtime-theme?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: options?.signal,
    });

    return parseResponse<any>(response);
  }
}
