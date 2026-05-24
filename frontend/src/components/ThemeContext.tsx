import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ThemeProperties {
  '--bg-main': string;
  '--bg-sidebar': string;
  '--bg-card': string;
  '--border-color': string;
  '--border-hover': string;
  '--text-main': string;
  '--text-muted': string;
  '--color-brand': string;
  '--color-brand-hover': string;
  '--color-brand-dark': string;
  '--bg-image': string;
  '--bg-image-opacity': string;
  '--bg-image-blur': string;
}

export type ThemePreset = 'google_ai_studio' | 'zed_dark' | 'antigravity' | 'dracula' | 'nordic_frost' | 'custom';

export interface ThemeConfig {
  preset: ThemePreset;
  customProperties: ThemeProperties;
}

export const THEME_PRESETS: Record<Exclude<ThemePreset, 'custom'>, ThemeProperties> = {
  google_ai_studio: {
    '--bg-main': '#09090b',
    '--bg-sidebar': '#121214',
    '--bg-card': '#1a1a1e',
    '--border-color': '#18181b',
    '--border-hover': '#3f3f46',
    '--text-main': '#e4e4e7',
    '--text-muted': '#a1a1aa',
    '--color-brand': '#3b82f6',
    '--color-brand-hover': '#2563eb',
    '--color-brand-dark': '#1d4ed8',
    '--bg-image': 'none',
    '--bg-image-opacity': '0.1',
    '--bg-image-blur': '0px',
  },
  zed_dark: {
    '--bg-main': '#18181b',
    '--bg-sidebar': '#202022',
    '--bg-card': '#27272a',
    '--border-color': '#2d2d30',
    '--border-hover': '#3f3f46',
    '--text-main': '#f4f4f5',
    '--text-muted': '#a1a1aa',
    '--color-brand': '#4f46e5', // indigo
    '--color-brand-hover': '#4338ca',
    '--color-brand-dark': '#3730a3',
    '--bg-image': 'none',
    '--bg-image-opacity': '0.1',
    '--bg-image-blur': '0px',
  },
  antigravity: {
    '--bg-main': '#0f172a',
    '--bg-sidebar': '#0b0f19',
    '--bg-card': '#1e293b',
    '--border-color': '#334155',
    '--border-hover': '#475569',
    '--text-main': '#f8fafc',
    '--text-muted': '#94a3b8',
    '--color-brand': '#10b981', // emerald green
    '--color-brand-hover': '#059669',
    '--color-brand-dark': '#047857',
    '--bg-image': 'none',
    '--bg-image-opacity': '0.15',
    '--bg-image-blur': '0px',
  },
  dracula: {
    '--bg-main': '#282a36',
    '--bg-sidebar': '#1e1f29',
    '--bg-card': '#44475a',
    '--border-color': '#44475a',
    '--border-hover': '#6272a4',
    '--text-main': '#f8f8f2',
    '--text-muted': '#6272a4',
    '--color-brand': '#bd93f9', // purple
    '--color-brand-hover': '#ab7fe6',
    '--color-brand-dark': '#9b6ad6',
    '--bg-image': 'none',
    '--bg-image-opacity': '0.1',
    '--bg-image-blur': '0px',
  },
  nordic_frost: {
    '--bg-main': '#1a202c',
    '--bg-sidebar': '#2d3748',
    '--bg-card': '#4a5568',
    '--border-color': '#4a5568',
    '--border-hover': '#718096',
    '--text-main': '#edf2f7',
    '--text-muted': '#a0aec0',
    '--color-brand': '#3182ce', // blue
    '--color-brand-hover': '#2b6cb0',
    '--color-brand-dark': '#2c5282',
    '--bg-image': 'none',
    '--bg-image-opacity': '0.1',
    '--bg-image-blur': '0px',
  },
};

interface ThemeContextType {
  preset: ThemePreset;
  themeProperties: ThemeProperties;
  setThemePreset: (preset: ThemePreset) => void;
  updateThemeProperty: (property: keyof ThemeProperties, value: string) => void;
  importTheme: (themeJson: string) => boolean;
  exportTheme: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preset, setPreset] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem('selflearned_theme_preset');
    return (saved as ThemePreset) || 'google_ai_studio';
  });

  const [customProps, setCustomProps] = useState<ThemeProperties>(() => {
    const saved = localStorage.getItem('selflearned_custom_props');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load custom properties", e);
      }
    }
    // Default fallback to Google AI Studio values
    return { ...THEME_PRESETS.google_ai_studio };
  });

  // Calculate current active theme properties based on preset selection
  const currentProperties = React.useMemo<ThemeProperties>(() => {
    if (preset === 'custom') {
      return customProps;
    }
    return THEME_PRESETS[preset];
  }, [preset, customProps]);

  // Apply theme variables dynamically into HTML document root
  const applyTheme = useCallback((props: ThemeProperties) => {
    const root = document.documentElement;
    Object.entries(props).forEach(([prop, val]) => {
      if (prop === '--bg-image') {
        const formattedVal = val && val !== 'none' ? `url("${val}")` : 'none';
        root.style.setProperty(prop, formattedVal);
      } else {
        root.style.setProperty(prop, val);
      }
    });
  }, []);

  // Update theme when properties or preset changes
  useEffect(() => {
    applyTheme(currentProperties);
    localStorage.setItem('selflearned_theme_preset', preset);
  }, [preset, currentProperties, applyTheme]);

  // Helper function to set new theme preset
  const setThemePreset = (newPreset: ThemePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      // If choosing a preset, copy its properties to custom as editable base
      setCustomProps({ ...THEME_PRESETS[newPreset] });
      localStorage.setItem('selflearned_custom_props', JSON.stringify(THEME_PRESETS[newPreset]));
    }
  };

  // Helper function to dynamically modify individual colors in theme creator
  const updateThemeProperty = (property: keyof ThemeProperties, value: string) => {
    setPreset('custom');
    setCustomProps((prev) => {
      const updated = { ...prev, [property]: value };
      localStorage.setItem('selflearned_custom_props', JSON.stringify(updated));
      return updated;
    });
  };

  // Import custom theme JSON
  const importTheme = (themeJson: string): boolean => {
    try {
      const parsed = JSON.parse(themeJson);
      if (parsed && typeof parsed === 'object') {
        const validated: Partial<ThemeProperties> = {};
        
        // Populate standard properties with default fallbacks if missing
        const standardKeys: Array<keyof ThemeProperties> = [
          '--bg-main', '--bg-sidebar', '--bg-card', '--border-color',
          '--border-hover', '--text-main', '--text-muted',
          '--color-brand', '--color-brand-hover', '--color-brand-dark',
          '--bg-image', '--bg-image-opacity', '--bg-image-blur'
        ];

        standardKeys.forEach((k) => {
          validated[k] = parsed[k] || THEME_PRESETS.google_ai_studio[k];
        });

        setCustomProps(validated as ThemeProperties);
        localStorage.setItem('selflearned_custom_props', JSON.stringify(validated));
        setPreset('custom');
        return true;
      }
    } catch (e) {
      console.error("Theme JSON import failed:", e);
    }
    return false;
  };

  // Export current theme properties to JSON string
  const exportTheme = (): string => {
    return JSON.stringify(currentProperties, null, 2);
  };

  return (
    <ThemeContext.Provider value={{
      preset,
      themeProperties: currentProperties,
      setThemePreset,
      updateThemeProperty,
      importTheme,
      exportTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
