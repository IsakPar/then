import React from 'react';
import { SeatMapTheme } from '../../components/seatmap/types';

// ============================================================================
// VENUE THEMING SYSTEM
// ============================================================================

export interface VenueColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface VenueFonts {
  primary: {
    family: string;
    weights: string[];
  };
  secondary: {
    family: string;
    weights: string[];
  };
  monospace: {
    family: string;
    weights: string[];
  };
}

export interface VenueBranding {
  logo?: string;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  brandName: string;
  tagline?: string;
  websiteUrl?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

export interface VenueTheme {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'auto';
  colors: {
    light: VenueColors;
    dark: VenueColors;
  };
  fonts: VenueFonts;
  branding: VenueBranding;
  seatMapOverrides?: Partial<SeatMapTheme>;
  customCSS?: string;
}

// ============================================================================
// DEFAULT THEME DEFINITIONS
// ============================================================================

const defaultLightColors: VenueColors = {
  primary: '#2563eb',       // Blue-600
  secondary: '#64748b',     // Slate-500
  accent: '#f59e0b',        // Amber-500
  background: '#ffffff',    // White
  surface: '#f8fafc',       // Slate-50
  text: '#0f172a',          // Slate-900
  textSecondary: '#475569', // Slate-600
  border: '#e2e8f0',        // Slate-200
  success: '#10b981',       // Emerald-500
  warning: '#f59e0b',       // Amber-500
  error: '#ef4444'          // Red-500
};

const defaultDarkColors: VenueColors = {
  primary: '#3b82f6',       // Blue-500
  secondary: '#94a3b8',     // Slate-400
  accent: '#fbbf24',        // Amber-400
  background: '#0f172a',    // Slate-900
  surface: '#1e293b',       // Slate-800
  text: '#f1f5f9',          // Slate-100
  textSecondary: '#cbd5e1', // Slate-300
  border: '#334155',        // Slate-700
  success: '#34d399',       // Emerald-400
  warning: '#fbbf24',       // Amber-400
  error: '#f87171'          // Red-400
};

const defaultFonts: VenueFonts = {
  primary: {
    family: 'Inter, system-ui, -apple-system, sans-serif',
    weights: ['400', '500', '600', '700']
  },
  secondary: {
    family: 'Inter, system-ui, -apple-system, sans-serif',
    weights: ['400', '500', '600']
  },
  monospace: {
    family: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    weights: ['400', '500', '600']
  }
};

// ============================================================================
// VENUE-SPECIFIC THEMES
// ============================================================================

export const venueThemes: Record<string, VenueTheme> = {
  // Default/Generic Theme
  default: {
    id: 'default',
    name: 'LastMinuteLive Default',
    type: 'light',
    colors: {
      light: defaultLightColors,
      dark: defaultDarkColors
    },
    fonts: defaultFonts,
    branding: {
      brandName: 'LastMinuteLive',
      tagline: 'Premium Theatre Experiences',
      websiteUrl: 'https://lastminutelive.com'
    }
  },

  // West End Theatre Theme
  westEnd: {
    id: 'westEnd',
    name: 'West End Classic',
    type: 'light',
    colors: {
      light: {
        ...defaultLightColors,
        primary: '#8b0000',        // Dark Red
        secondary: '#cd853f',      // Peru
        accent: '#ffd700',         // Gold
        background: '#faf8f5',     // Warm white
        surface: '#f5f2ed'         // Warm surface
      },
      dark: {
        ...defaultDarkColors,
        primary: '#dc2626',        // Red-600
        secondary: '#d4a574',      // Warm tan
        accent: '#fbbf24',         // Amber-400
        background: '#1a1512',     // Warm dark
        surface: '#2d2419'         // Warm dark surface
      }
    },
    fonts: {
      primary: {
        family: 'Playfair Display, Georgia, serif',
        weights: ['400', '500', '600', '700']
      },
      secondary: {
        family: 'Inter, system-ui, sans-serif',
        weights: ['400', '500', '600']
      },
      monospace: defaultFonts.monospace
    },
    branding: {
      brandName: 'West End Theatre',
      tagline: 'Classic London Theatre Experience'
    },
    seatMapOverrides: {
      colors: {
        background: '#faf8f5',
        stage: '#8b0000',
        stageText: '#ffffff',
        available: '#f5f2ed',
        selected: '#ffd700',
        selectedBorder: '#8b0000',
        booked: '#cd853f',
        reserved: '#ddd6ce',
        accessible: '#10b981',
        seatText: '#1a1512',
        selectedText: '#8b0000',
        sectionLabel: '#8b0000',
        sectionBackground: 'rgba(205, 133, 63, 0.1)'
      }
    }
  },

  // Broadway Theme
  broadway: {
    id: 'broadway',
    name: 'Broadway Spectacular',
    type: 'dark',
    colors: {
      light: {
        ...defaultLightColors,
        primary: '#dc2626',        // Red-600
        secondary: '#1f2937',      // Gray-800
        accent: '#fbbf24',         // Amber-400
        background: '#ffffff',
        surface: '#f9fafb'
      },
      dark: {
        ...defaultDarkColors,
        primary: '#ef4444',        // Red-500
        secondary: '#6b7280',      // Gray-500
        accent: '#fcd34d',         // Amber-300
        background: '#111827',     // Gray-900
        surface: '#1f2937'         // Gray-800
      }
    },
    fonts: {
      primary: {
        family: 'Oswald, Impact, sans-serif',
        weights: ['400', '500', '600', '700']
      },
      secondary: {
        family: 'Open Sans, system-ui, sans-serif',
        weights: ['400', '500', '600']
      },
      monospace: defaultFonts.monospace
    },
    branding: {
      brandName: 'Broadway Theatre',
      tagline: 'The Heart of New York Theatre'
    },
    seatMapOverrides: {
      colors: {
        background: '#111827',
        stage: '#dc2626',
        stageText: '#ffffff',
        available: '#374151',
        selected: '#fcd34d',
        selectedBorder: '#dc2626',
        booked: '#6b7280',
        reserved: '#4b5563',
        accessible: '#10b981',
        seatText: '#f9fafb',
        selectedText: '#111827',
        sectionLabel: '#f9fafb',
        sectionBackground: 'rgba(220, 38, 38, 0.2)'
      }
    }
  },

  // Modern Minimalist Theme
  modern: {
    id: 'modern',
    name: 'Modern Minimalist',
    type: 'light',
    colors: {
      light: {
        ...defaultLightColors,
        primary: '#000000',        // Pure Black
        secondary: '#6b7280',      // Gray-500
        accent: '#3b82f6',         // Blue-500
        background: '#ffffff',
        surface: '#fafafa',        // Very light gray
        border: '#f0f0f0'          // Light border
      },
      dark: {
        ...defaultDarkColors,
        primary: '#ffffff',        // Pure White
        secondary: '#9ca3af',      // Gray-400
        accent: '#60a5fa',         // Blue-400
        background: '#000000',
        surface: '#0a0a0a'
      }
    },
    fonts: {
      primary: {
        family: 'Helvetica Neue, Arial, sans-serif',
        weights: ['300', '400', '500', '600']
      },
      secondary: {
        family: 'Helvetica Neue, Arial, sans-serif',
        weights: ['300', '400', '500']
      },
      monospace: defaultFonts.monospace
    },
    branding: {
      brandName: 'Modern Theatre',
      tagline: 'Contemporary Performance Space'
    },
    seatMapOverrides: {
      colors: {
        background: '#ffffff',
        stage: '#000000',
        stageText: '#ffffff',
        available: '#fafafa',
        selected: '#3b82f6',
        selectedBorder: '#000000',
        booked: '#6b7280',
        reserved: '#e5e7eb',
        accessible: '#10b981',
        seatText: '#000000',
        selectedText: '#ffffff',
        sectionLabel: '#000000',
        sectionBackground: 'rgba(0, 0, 0, 0.05)'
      }
    }
  },

  // Royal Opera House Theme
  royal: {
    id: 'royal',
    name: 'Royal Opera House',
    type: 'light',
    colors: {
      light: {
        ...defaultLightColors,
        primary: '#4c1d95',        // Purple-900
        secondary: '#7c2d12',      // Orange-900
        accent: '#fbbf24',         // Amber-400
        background: '#fefef9',     // Warm white
        surface: '#f7f3e9'         // Cream
      },
      dark: {
        ...defaultDarkColors,
        primary: '#7c3aed',        // Purple-600
        secondary: '#ea580c',      // Orange-600
        accent: '#fcd34d',         // Amber-300
        background: '#1e1412',     // Dark warm
        surface: '#2d1f17'
      }
    },
    fonts: {
      primary: {
        family: 'Cormorant Garamond, Georgia, serif',
        weights: ['400', '500', '600', '700']
      },
      secondary: {
        family: 'Source Sans Pro, system-ui, sans-serif',
        weights: ['400', '500', '600']
      },
      monospace: defaultFonts.monospace
    },
    branding: {
      brandName: 'Royal Opera House',
      tagline: 'Home of Opera and Ballet'
    },
    seatMapOverrides: {
      colors: {
        background: '#fefef9',
        stage: '#4c1d95',
        stageText: '#ffffff',
        available: '#f7f3e9',
        selected: '#fbbf24',
        selectedBorder: '#4c1d95',
        booked: '#7c2d12',
        reserved: '#e7dcc6',
        accessible: '#10b981',
        seatText: '#1e1412',
        selectedText: '#4c1d95',
        sectionLabel: '#4c1d95',
        sectionBackground: 'rgba(76, 29, 149, 0.1)'
      }
    }
  }
};

// ============================================================================
// THEME UTILITIES
// ============================================================================

export class VenueThemeManager {
  private currentTheme: VenueTheme;
  private prefersDarkMode: boolean;
  private mediaQuery: MediaQueryList;

  constructor(initialThemeId: string = 'default') {
    this.currentTheme = venueThemes[initialThemeId] || venueThemes.default;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDarkMode = this.mediaQuery.matches;

    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
  }

  private handleSystemThemeChange = (e: MediaQueryListEvent) => {
    this.prefersDarkMode = e.matches;
    if (this.currentTheme.type === 'auto') {
      this.applyTheme();
    }
  };

  getCurrentTheme(): VenueTheme {
    return this.currentTheme;
  }

  getActiveColorScheme(): VenueColors {
    const shouldUseDark = 
      this.currentTheme.type === 'dark' || 
      (this.currentTheme.type === 'auto' && this.prefersDarkMode);
    
    return shouldUseDark ? this.currentTheme.colors.dark : this.currentTheme.colors.light;
  }

  setTheme(themeId: string): boolean {
    const theme = venueThemes[themeId];
    if (!theme) {
      console.warn(`Theme "${themeId}" not found. Using default theme.`);
      return false;
    }

    this.currentTheme = theme;
    this.applyTheme();
    return true;
  }

  createCustomTheme(baseThemeId: string, overrides: Partial<VenueTheme>): VenueTheme {
    const baseTheme = venueThemes[baseThemeId] || venueThemes.default;
    
    return {
      ...baseTheme,
      ...overrides,
      id: overrides.id || `custom-${Date.now()}`,
      colors: {
        light: { ...baseTheme.colors.light, ...(overrides.colors?.light || {}) },
        dark: { ...baseTheme.colors.dark, ...(overrides.colors?.dark || {}) }
      },
      fonts: { ...baseTheme.fonts, ...(overrides.fonts || {}) },
      branding: { ...baseTheme.branding, ...(overrides.branding || {}) }
    };
  }

  registerCustomTheme(theme: VenueTheme): void {
    venueThemes[theme.id] = theme;
  }

  applyTheme(): void {
    const colors = this.getActiveColorScheme();
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--venue-${key}`, value);
    });

    // Apply font families
    root.style.setProperty('--venue-font-primary', this.currentTheme.fonts.primary.family);
    root.style.setProperty('--venue-font-secondary', this.currentTheme.fonts.secondary.family);
    root.style.setProperty('--venue-font-monospace', this.currentTheme.fonts.monospace.family);

    // Apply custom CSS if provided
    if (this.currentTheme.customCSS) {
      this.injectCustomCSS(this.currentTheme.customCSS);
    }

    // Update meta theme color for mobile browsers
    this.updateMetaThemeColor(colors.primary);

    // Emit theme change event
    window.dispatchEvent(new CustomEvent('venueThemeChanged', {
      detail: { theme: this.currentTheme, colors }
    }));
  }

  private injectCustomCSS(css: string): void {
    const existingStyle = document.getElementById('venue-custom-theme');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'venue-custom-theme';
    style.textContent = css;
    document.head.appendChild(style);
  }

  private updateMetaThemeColor(color: string): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);
  }

  getSeatMapTheme(): SeatMapTheme {
    const colors = this.getActiveColorScheme();
    const baseTheme: SeatMapTheme = {
      colors: {
        background: colors.background,
        stage: colors.primary,
        stageText: colors.background,
        available: colors.surface,
        selected: colors.accent,
        selectedBorder: colors.primary,
        booked: colors.secondary,
        reserved: colors.border,
        accessible: colors.success,
        seatText: colors.text,
        selectedText: colors.text,
        sectionLabel: colors.textSecondary,
        sectionBackground: `${colors.primary}20` // 20% opacity
      },
      sizing: {
        minSeatRadius: 8,
        maxSeatRadius: 20,
        seatSpacingFactor: 1.8,
        strokeWidth: 1,
        selectedStrokeWidth: 2
      },
      fonts: {
        seatNumber: {
          family: this.currentTheme.fonts.secondary.family,
          weight: '500'
        },
        sectionLabel: {
          family: this.currentTheme.fonts.primary.family,
          weight: '600'
        }
      }
    };

    // Apply theme overrides if present
    if (this.currentTheme.seatMapOverrides) {
      return this.deepMerge(baseTheme, this.currentTheme.seatMapOverrides);
    }

    return baseTheme;
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] as any, source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }
    
    return result;
  }

  exportTheme(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  importTheme(themeJson: string): boolean {
    try {
      const theme = JSON.parse(themeJson) as VenueTheme;
      this.registerCustomTheme(theme);
      this.setTheme(theme.id);
      return true;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return false;
    }
  }

  getAvailableThemes(): { id: string; name: string; type: string }[] {
    return Object.values(venueThemes).map(theme => ({
      id: theme.id,
      name: theme.name,
      type: theme.type
    }));
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

export const useVenueTheme = (themeId?: string) => {
  const [themeManager] = React.useState(() => new VenueThemeManager(themeId));
  const [currentTheme, setCurrentTheme] = React.useState(themeManager.getCurrentTheme());
  const [colors, setColors] = React.useState(themeManager.getActiveColorScheme());

  React.useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(themeManager.getCurrentTheme());
      setColors(themeManager.getActiveColorScheme());
    };

    window.addEventListener('venueThemeChanged', handleThemeChange);
    return () => window.removeEventListener('venueThemeChanged', handleThemeChange);
  }, [themeManager]);

  const changeTheme = React.useCallback((newThemeId: string) => {
    return themeManager.setTheme(newThemeId);
  }, [themeManager]);

  const getSeatMapTheme = React.useCallback(() => {
    return themeManager.getSeatMapTheme();
  }, [themeManager, currentTheme]);

  return {
    currentTheme,
    colors,
    changeTheme,
    getSeatMapTheme,
    availableThemes: themeManager.getAvailableThemes(),
    themeManager
  };
};

// Global theme manager instance
export const globalThemeManager = new VenueThemeManager();

export default VenueThemeManager; 