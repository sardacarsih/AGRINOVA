import type {
  ThemeAppUiSlot,
  ThemeAppUiSlots,
} from '@/features/theme-campaigns/types/theme-campaign';

export type AppUiSlotKey = keyof ThemeAppUiSlots;
export type AppUiSlotFieldKey = keyof ThemeAppUiSlot;
export type AppUiColorFieldKey = Exclude<AppUiSlotFieldKey, 'asset'>;

export const APP_UI_SLOT_CONFIG: Array<{
  key: AppUiSlotKey;
  label: string;
  description: string;
}> = [
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

export const APP_UI_SLOT_FIELD_CONFIG: Array<{
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

export const APP_UI_COLOR_FIELD_KEYS: AppUiColorFieldKey[] = [
  'backgroundColor',
  'foregroundColor',
  'textColor',
  'borderColor',
  'accentColor',
  'iconColor',
];

const APP_UI_COLOR_FIELD_SET = new Set<AppUiColorFieldKey>(APP_UI_COLOR_FIELD_KEYS);

export const isAppUiColorField = (
  fieldKey: AppUiSlotFieldKey
): fieldKey is AppUiColorFieldKey =>
  APP_UI_COLOR_FIELD_SET.has(fieldKey as AppUiColorFieldKey);

export const normalizeAppUiSlot = (slot?: ThemeAppUiSlot): ThemeAppUiSlot => ({
  backgroundColor: slot?.backgroundColor || '',
  foregroundColor: slot?.foregroundColor || '',
  textColor: slot?.textColor || '',
  borderColor: slot?.borderColor || '',
  accentColor: slot?.accentColor || '',
  iconColor: slot?.iconColor || '',
  asset: slot?.asset || '',
});

export const mapAppUiSlots = (slots?: ThemeAppUiSlots): ThemeAppUiSlots =>
  APP_UI_SLOT_CONFIG.reduce<ThemeAppUiSlots>((acc, slot) => {
    acc[slot.key] = normalizeAppUiSlot(slots?.[slot.key]);
    return acc;
  }, {});
