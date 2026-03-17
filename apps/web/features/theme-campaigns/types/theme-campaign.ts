export type ThemeCampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'DISABLED';

export type ThemePlatform = 'web' | 'mobile';

export interface ThemeAppUiSlot {
  backgroundColor?: string;
  foregroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
  iconColor?: string;
  asset?: string;
}

export interface ThemeAppUiSlots {
  navbar?: ThemeAppUiSlot;
  sidebar?: ThemeAppUiSlot;
  footer?: ThemeAppUiSlot;
  dashboard?: ThemeAppUiSlot;
  notification_banner?: ThemeAppUiSlot;
  empty_state_illustration?: ThemeAppUiSlot;
  modal_accent?: ThemeAppUiSlot;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeModeVariants<T> {
  light?: T;
  dark?: T;
  [key: string]: unknown;
}

export interface ThemeTokenConfig {
  accentColor: string;
  accentSoftColor: string;
  loginCardBorder: string;
  modes?: ThemeModeVariants<ThemeTokenConfig>;
  [key: string]: unknown;
}

export interface ThemeAssetManifest {
  backgroundImage: string;
  illustration: string;
  iconPack: string;
  accentAsset: string;
  app_ui?: ThemeAppUiSlots;
  web?: ThemePlatformAssets;
  mobile?: ThemePlatformAssets;
  modes?: ThemeModeVariants<ThemeAssetManifest>;
  [key: string]: unknown;
}

export interface ThemeEntity {
  id: string;
  code: string;
  name: string;
  type: 'base' | 'seasonal';
  is_active: boolean;
  token_json: ThemeTokenConfig;
  asset_manifest_json: ThemeAssetManifest;
}

export interface ThemePlatformAssets {
  backgroundImage?: string;
  illustration?: string;
  iconPack: string;
  accentAsset: string;
  app_ui?: ThemeAppUiSlots;
}

export interface ThemeCampaignAssets {
  web: ThemePlatformAssets;
  mobile: ThemePlatformAssets;
}

export interface ThemeCampaign {
  id: string;
  theme_id: string;
  campaign_group_key: string;
  campaign_name: string;
  description: string;
  enabled: boolean;
  start_at?: string;
  end_at?: string;
  priority: number;
  light_mode_enabled: boolean;
  dark_mode_enabled: boolean;
  assets: ThemeCampaignAssets;
  updated_by: string;
  updated_at: string;
  status?: ThemeCampaignStatus;
}

export interface ThemeSettings {
  default_theme_id: string;
  global_kill_switch: boolean;
}

export interface ThemeAuditLog {
  id: string;
  actor: string;
  action: string;
  target_entity: string;
  timestamp: string;
  before_summary: string;
  after_summary: string;
}

export interface ThemeCampaignFilters {
  search: string;
  status: 'all' | ThemeCampaignStatus;
}

export type ThemeCampaignSortField =
  | 'campaign_name'
  | 'theme_name'
  | 'priority'
  | 'start_at'
  | 'end_at'
  | 'updated_at'
  | 'status';

export type SortDirection = 'asc' | 'desc';

export interface ThemeCampaignFormValues {
  campaign_group_key: string;
  campaign_name: string;
  theme_id: string;
  description: string;
  enabled: boolean;
  priority: number;
  start_at?: string;
  end_at?: string;
  light_mode_enabled: boolean;
  dark_mode_enabled: boolean;
  assets: ThemeCampaignAssets;
}

export interface ThemeMasterFormValues {
  code: string;
  name: string;
  type: 'base' | 'seasonal';
  is_active: boolean;
  token_json: ThemeTokenConfig;
  asset_manifest_json: ThemeAssetManifest;
}

export interface ThemeCampaignStats {
  total: number;
  active: number;
  scheduled: number;
  killSwitchEnabled: boolean;
}

export const EMPTY_PLATFORM_ASSETS: ThemePlatformAssets = {
  backgroundImage: '',
  illustration: '',
  iconPack: '',
  accentAsset: '',
  app_ui: {},
};

export const EMPTY_THEME_CAMPAIGN_ASSETS: ThemeCampaignAssets = {
  web: { ...EMPTY_PLATFORM_ASSETS },
  mobile: { ...EMPTY_PLATFORM_ASSETS },
};

export function resolveCampaignStatus(
  campaign: ThemeCampaign,
  referenceDate = new Date()
): ThemeCampaignStatus {
  if (!campaign.enabled) {
    return 'DISABLED';
  }

  if (!campaign.start_at || !campaign.end_at) {
    return 'DRAFT';
  }

  const start = new Date(campaign.start_at);
  const end = new Date(campaign.end_at);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 'DRAFT';
  }

  if (referenceDate < start) {
    return 'SCHEDULED';
  }

  if (referenceDate > end) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}
