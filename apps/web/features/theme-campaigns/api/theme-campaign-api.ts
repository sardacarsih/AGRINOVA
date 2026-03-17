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

export interface RuntimeThemeResponseMeta {
  status: number;
  etag: string | null;
  data: any | null;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body?.message || 'Request failed');
  }
  return body;
};

const parseJsonSafely = async (response: Response): Promise<any | null> => {
  const raw = await response.text();
  if (!raw.trim()) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
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
      assetKey: 'backgroundImage' | 'illustration' | 'appUiAsset';
      slotKey?: string;
    }
  ) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('platform', params.platform);
    formData.set('assetKey', params.assetKey);
    if (typeof params.slotKey === 'string' && params.slotKey.trim()) {
      formData.set('slotKey', params.slotKey.trim());
    }

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
    const result = await ThemeCampaignApi.getRuntimeThemeWithMeta(params, options);
    return result.data ?? {};
  }

  static async getRuntimeThemeWithMeta(
    params: { platform: string; mode?: 'light' | 'dark' },
    options?: { signal?: AbortSignal; ifNoneMatch?: string }
  ): Promise<RuntimeThemeResponseMeta> {
    const query = new URLSearchParams({
      platform: params.platform,
    });
    if (params.mode) {
      query.set('mode', params.mode);
    }

    const endpointCandidates = [
      '/api/public/themes/login',
      '/api/theme-campaigns/runtime-theme',
    ];

    let lastError: Error | null = null;
    for (const endpoint of endpointCandidates) {
      const headers = new Headers();
      if (options?.ifNoneMatch) {
        headers.set('If-None-Match', options.ifNoneMatch);
      }

      try {
        const response = await fetch(`${endpoint}?${query.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          signal: options?.signal,
          headers,
        });

        if (response.status === 404 && endpoint === '/api/public/themes/login') {
          continue;
        }

        const etag = response.headers.get('etag');

        if (response.status === 304) {
          return {
            status: 304,
            etag,
            data: null,
          };
        }

        const body = await parseJsonSafely(response);
        if (!response.ok) {
          throw new Error(body?.message || 'Request failed');
        }

        return {
          status: response.status,
          etag,
          data: body,
        };
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
          continue;
        }
        lastError = new Error('Failed to load runtime theme');
      }
    }

    throw lastError || new Error('Failed to load runtime theme');
  }
}
