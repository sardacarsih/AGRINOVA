export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  neutral: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
  cardForeground: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Plantation-inspired color schemes for AgrInova Palm Oil Management System
export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  slate: {
    id: 'slate',
    name: 'Slate Modern',
    nameEn: 'Slate Modern',
    description: 'Tema netral populer ala shadcn/ui',
    descriptionEn: 'Popular neutral shadcn/ui theme',
    icon: 'Palette',
    colors: {
      light: {
        primary: '240 5.9% 10%',
        primaryForeground: '0 0% 98%',
        secondary: '240 4.8% 95.9%',
        secondaryForeground: '240 5.9% 10%',
        accent: '240 4.8% 95.9%',
        accentForeground: '240 5.9% 10%',
        neutral: '240 4% 46%',
        background: '0 0% 100%',
        foreground: '240 10% 3.9%',
        muted: '240 4.8% 95.9%',
        mutedForeground: '240 3.8% 46.1%',
        border: '240 5.9% 90%',
        card: '0 0% 100%',
        cardForeground: '240 10% 3.9%',
      },
      dark: {
        primary: '0 0% 98%',
        primaryForeground: '240 5.9% 10%',
        secondary: '240 3.7% 15.9%',
        secondaryForeground: '0 0% 98%',
        accent: '240 3.7% 15.9%',
        accentForeground: '0 0% 98%',
        neutral: '240 5% 64.9%',
        background: '240 10% 3.9%',
        foreground: '0 0% 98%',
        muted: '240 3.7% 15.9%',
        mutedForeground: '240 5% 64.9%',
        border: '240 3.7% 15.9%',
        card: '240 10% 3.9%',
        cardForeground: '0 0% 98%',
      },
    },
    preview: {
      primary: '#18181B',
      secondary: '#F4F4F5',
      accent: '#E4E4E7',
    },
  },
  'palm-green': {
    id: 'palm-green',
    name: 'Hijau Sawit',
    nameEn: 'Palm Green',
    description: 'Tema utama terinspirasi daun kelapa sawit',
    descriptionEn: 'Primary theme inspired by palm fronds',
    icon: 'Leaf',
    colors: {
      light: {
        primary: '142 41% 25%',           // Deep palm green #3D6B24
        primaryForeground: '0 0% 100%',
        secondary: '138 25% 94%',          // Light sage mint
        secondaryForeground: '142 41% 20%',
        accent: '43 74% 49%',              // Golden palm fruit #D4A017
        accentForeground: '43 74% 10%',
        neutral: '142 15% 45%',
        background: '40 23% 97%',          // Warm off-white
        foreground: '142 25% 15%',         // Dark green text
        muted: '138 15% 92%',
        mutedForeground: '142 15% 40%',
        border: '138 15% 85%',
        card: '0 0% 100%',
        cardForeground: '142 25% 15%',
      },
      dark: {
        primary: '142 50% 40%',            // Brighter palm green for dark mode
        primaryForeground: '142 41% 10%',
        secondary: '142 30% 18%',          // Deep forest secondary
        secondaryForeground: '138 25% 90%',
        accent: '43 74% 55%',              // Golden palm fruit (brighter)
        accentForeground: '43 74% 10%',
        neutral: '138 15% 60%',
        background: '150 30% 7%',          // Deep forest background
        foreground: '138 20% 92%',         // Light text
        muted: '142 25% 15%',
        mutedForeground: '138 15% 60%',
        border: '142 20% 20%',
        card: '150 25% 10%',
        cardForeground: '138 20% 92%',
      },
    },
    preview: {
      primary: '#3D6B24',
      secondary: '#E8F0E3',
      accent: '#D4A017',
    },
  },
  'earth-brown': {
    id: 'earth-brown',
    name: 'Coklat Tanah',
    nameEn: 'Earth Brown',
    description: 'Nuansa hangat terinspirasi tanah perkebunan',
    descriptionEn: 'Warm tones inspired by plantation soil',
    icon: 'Mountain',
    colors: {
      light: {
        primary: '16 30% 35%',             // Rich earthy brown #5D4037
        primaryForeground: '0 0% 100%',
        secondary: '30 25% 94%',           // Warm beige
        secondaryForeground: '16 30% 25%',
        accent: '14 50% 50%',              // Terracotta/rust
        accentForeground: '0 0% 100%',
        neutral: '16 15% 45%',
        background: '35 30% 97%',          // Cream/ivory
        foreground: '16 25% 18%',          // Dark brown text
        muted: '30 20% 92%',
        mutedForeground: '16 15% 45%',
        border: '30 20% 85%',
        card: '0 0% 100%',
        cardForeground: '16 25% 18%',
      },
      dark: {
        primary: '16 35% 50%',             // Brighter brown for dark mode
        primaryForeground: '16 30% 10%',
        secondary: '16 25% 18%',
        secondaryForeground: '30 25% 90%',
        accent: '14 55% 55%',              // Brighter terracotta
        accentForeground: '14 50% 10%',
        neutral: '30 15% 60%',
        background: '16 35% 8%',           // Deep chocolate background
        foreground: '30 20% 92%',
        muted: '16 25% 15%',
        mutedForeground: '30 15% 60%',
        border: '16 25% 20%',
        card: '16 30% 11%',
        cardForeground: '30 20% 92%',
      },
    },
    preview: {
      primary: '#5D4037',
      secondary: '#F5F0EB',
      accent: '#C45C26',
    },
  },
  'soil-gray': {
    id: 'soil-gray',
    name: 'Abu-abu Profesional',
    nameEn: 'Soil Gray',
    description: 'Tema netral profesional untuk kantor',
    descriptionEn: 'Professional neutral theme for office use',
    icon: 'Building2',
    colors: {
      light: {
        primary: '200 18% 30%',            // Professional charcoal #37474F
        primaryForeground: '0 0% 100%',
        secondary: '200 15% 95%',          // Cool gray secondary
        secondaryForeground: '200 18% 20%',
        accent: '210 29% 50%',             // Slate blue accent
        accentForeground: '0 0% 100%',
        neutral: '200 10% 45%',
        background: '210 10% 98%',         // Light gray background
        foreground: '200 18% 15%',         // Dark text
        muted: '200 15% 93%',
        mutedForeground: '200 10% 45%',
        border: '200 15% 87%',
        card: '0 0% 100%',
        cardForeground: '200 18% 15%',
      },
      dark: {
        primary: '200 25% 55%',            // Brighter slate for dark mode
        primaryForeground: '200 18% 10%',
        secondary: '200 15% 18%',
        secondaryForeground: '200 15% 90%',
        accent: '210 35% 55%',             // Brighter slate blue
        accentForeground: '210 29% 10%',
        neutral: '200 10% 60%',
        background: '200 18% 8%',          // True dark gray background
        foreground: '200 10% 92%',
        muted: '200 15% 15%',
        mutedForeground: '200 10% 60%',
        border: '200 15% 20%',
        card: '200 18% 11%',
        cardForeground: '200 10% 92%',
      },
    },
    preview: {
      primary: '#37474F',
      secondary: '#F0F2F4',
      accent: '#5C7B99',
    },
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = keyof typeof THEME_CONFIGS;

export interface AppearanceSettings {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  sidebarBehavior: 'auto' | 'expanded' | 'collapsed';
  animations: boolean;
  compactMode: boolean;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  mode: 'system',
  colorScheme: 'slate',
  fontSize: 'medium',
  density: 'comfortable',
  borderRadius: 'medium',
  reducedMotion: false,
  sidebarBehavior: 'auto',
  animations: true,
  compactMode: false,
};

export const FONT_SIZE_CONFIG = {
  small: {
    name: 'Small',
    nameId: 'Kecil',
    value: '14px',
    className: 'text-sm',
    preview: 'Aa',
  },
  medium: {
    name: 'Medium',
    nameId: 'Sedang',
    value: '16px',
    className: 'text-base',
    preview: 'Aa',
  },
  large: {
    name: 'Large',
    nameId: 'Besar',
    value: '18px',
    className: 'text-lg',
    preview: 'Aa',
  },
};

export const DENSITY_CONFIG = {
  compact: {
    name: 'Compact',
    nameId: 'Padat',
    description: 'More content in less space',
    descriptionId: 'Lebih banyak konten dalam ruang kecil',
    spacing: 'tight',
    padding: 'p-2',
  },
  comfortable: {
    name: 'Comfortable',
    nameId: 'Nyaman',
    description: 'Balanced spacing',
    descriptionId: 'Jarak yang seimbang',
    spacing: 'normal',
    padding: 'p-4',
  },
  spacious: {
    name: 'Spacious',
    nameId: 'Luas',
    description: 'Extra breathing room',
    descriptionId: 'Ruang ekstra yang lapang',
    spacing: 'loose',
    padding: 'p-6',
  },
};

export const BORDER_RADIUS_CONFIG = {
  none: {
    name: 'None',
    nameId: 'Tidak Ada',
    value: '0px',
    className: 'rounded-none',
    preview: '⬜',
  },
  small: {
    name: 'Small',
    nameId: 'Kecil',
    value: '4px',
    className: 'rounded-sm',
    preview: '▢',
  },
  medium: {
    name: 'Medium',
    nameId: 'Sedang',
    value: '8px',
    className: 'rounded-md',
    preview: '◾',
  },
  large: {
    name: 'Large',
    nameId: 'Besar',
    value: '12px',
    className: 'rounded-lg',
    preview: '●',
  },
};

// Helper function to generate CSS variables from theme config
export function generateThemeVariables(
  colorScheme: ColorScheme,
  mode: 'light' | 'dark'
): Record<string, string> {
  const theme = THEME_CONFIGS[colorScheme];
  if (!theme) {
    // Fallback to slate if theme not found
    const fallbackTheme = THEME_CONFIGS['slate'];
    if (!fallbackTheme) return {};
    return generateThemeVariables('slate', mode);
  }

  const colors = theme.colors[mode];

  return {
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--border': colors.border,
    '--input': colors.border,
    '--ring': colors.primary,
    '--ring-offset-background': colors.background,
    '--ring-offset-width': '2px',
    '--card': colors.card,
    '--card-foreground': colors.cardForeground,
    '--popover': colors.card,
    '--popover-foreground': colors.cardForeground,
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': mode === 'light' ? '0 0% 100%' : '0 0% 98%',

    // Sidebar specific variables - derived from theme colors
    '--sidebar-background': mode === 'light' ? colors.secondary : colors.card,
    '--sidebar-foreground': mode === 'light' ? colors.foreground : colors.cardForeground,
    '--sidebar-primary': colors.primary,
    '--sidebar-primary-foreground': colors.primaryForeground,
    '--sidebar-accent': mode === 'light' ? colors.muted : colors.muted,
    '--sidebar-accent-foreground': mode === 'light' ? colors.foreground : colors.cardForeground,
    '--sidebar-border': colors.border,
    '--sidebar-ring': colors.primary,
  };
}

// Helper to get system theme preference
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Storage keys
export const STORAGE_KEYS = {
  APPEARANCE_SETTINGS: 'agrinova-appearance-settings',
  THEME_MODE: 'agrinova-theme-mode',
  COLOR_SCHEME: 'agrinova-color-scheme',
} as const;

// Helper to get theme by ID with fallback
export function getThemeConfig(colorScheme: string): ThemeConfig {
  return THEME_CONFIGS[colorScheme] || THEME_CONFIGS['slate'];
}

// Get all available themes as array for UI rendering
export function getThemeList(): ThemeConfig[] {
  return Object.values(THEME_CONFIGS);
}
