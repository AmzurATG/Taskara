import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

// Define the base colors for both themes
const baseColors = {
  // Purple accents (same for both themes)
  accent: {
    primary: '#a259ff',
    secondary: '#c084fc',
    light: '#e879f9',
    dark: '#7c3aed',
  },
  
  // Status colors (same for both themes)
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// Dark theme colors
const darkColors = {
  ...baseColors,
  primary: '#181824',
  secondary: '#232136',
  
  text: {
    primary: '#ffffff',
    secondary: '#e2e8f0',
    muted: '#94a3b8',
    disabled: '#64748b',
  },
  
  border: '#374151',
  hover: '#374151',
  focus: '#4f46e5',
  overlay: 'rgba(0, 0, 0, 0.8)',
  
  surface: '#1e1b2e',
  elevated: '#2a2438',
  subtle: '#16141f',
};

// Light theme colors
const lightColors = {
  ...baseColors,
  primary: '#f8fafc',
  secondary: '#ffffff',
  
  text: {
    primary: '#1e293b',
    secondary: '#475569',
    muted: '#64748b',
    disabled: '#94a3b8',
  },
  
  border: '#e2e8f0',
  hover: '#f1f5f9',
  focus: '#4f46e5',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  surface: '#ffffff',
  elevated: '#f8fafc',
  subtle: '#f1f5f9',
};

// Typography configuration (same for both themes)
const typography = {
  fontFamily: [
    'Inter',
    'Poppins', 
    'Montserrat',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: '0.02em',
  },
};

// Create theme function
const createAppTheme = (mode, colors) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent.primary,
        light: colors.accent.light,
        dark: colors.accent.dark,
        contrastText: colors.text.primary,
      },
      secondary: {
        main: colors.accent.secondary,
        light: colors.accent.light,
        dark: colors.accent.dark,
        contrastText: colors.text.primary,
      },
      background: {
        default: colors.primary,
        paper: colors.secondary,
      },
      text: {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        disabled: colors.text.disabled,
      },
      error: {
        main: colors.status.error,
      },
      warning: {
        main: colors.status.warning,
      },
      info: {
        main: colors.status.info,
      },
      success: {
        main: colors.status.success,
      },
      divider: colors.border,
      action: {
        hover: colors.hover,
        selected: colors.elevated,
        focus: colors.focus,
      },
    },
    
    typography,
    
    shape: {
      borderRadius: 8,
    },
    
    spacing: 8,
    
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.primary,
            color: colors.text.primary,
            fontFamily: typography.fontFamily,
          },
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: colors.primary,
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: colors.border,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: colors.hover,
            },
          },
        },
      },
      
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.secondary,
            boxShadow: mode === 'dark' ? `0 1px 3px rgba(0, 0, 0, 0.2)` : `0 1px 3px rgba(0, 0, 0, 0.1)`,
            borderBottom: `1px solid ${colors.border}`,
          },
        },
      },
      
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.secondary,
            borderRight: `1px solid ${colors.border}`,
          },
        },
      },
      
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '6px',
            padding: '8px 16px',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(162, 89, 255, 0.3)',
            },
          },
          contained: {
            background: `linear-gradient(45deg, ${colors.accent.primary}, ${colors.accent.secondary})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${colors.accent.dark}, ${colors.accent.primary})`,
            },
          },
          outlined: {
            borderColor: colors.accent.primary,
            color: colors.accent.primary,
            '&:hover': {
              borderColor: colors.accent.secondary,
              backgroundColor: `${colors.accent.primary}10`,
            },
          },
        },
      },
      
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: colors.surface,
              '& fieldset': {
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: colors.accent.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.accent.primary,
              },
            },
          },
        },
      },
      
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: colors.elevated,
            color: colors.text.primary,
            border: `1px solid ${colors.border}`,
            '&:hover': {
              backgroundColor: colors.hover,
            },
          },
          colorPrimary: {
            backgroundColor: `${colors.accent.primary}20`,
            color: colors.accent.light,
            border: `1px solid ${colors.accent.primary}40`,
          },
        },
      },
      
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
          },
          elevation1: {
            boxShadow: mode === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
          },
          elevation2: {
            boxShadow: mode === 'dark' ? '0 4px 8px rgba(0, 0, 0, 0.15)' : '0 4px 8px rgba(0, 0, 0, 0.1)',
          },
          elevation3: {
            boxShadow: mode === 'dark' ? '0 8px 16px rgba(0, 0, 0, 0.2)' : '0 8px 16px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${colors.border}`,
            color: colors.text.primary,
          },
          head: {
            backgroundColor: colors.elevated,
            fontWeight: 600,
            color: colors.text.primary,
          },
        },
      },
      
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: colors.text.secondary,
            '&:hover': {
              backgroundColor: `${colors.accent.primary}15`,
              color: colors.accent.primary,
            },
          },
        },
      },
      
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            color: colors.text.muted,
            '&.Mui-selected': {
              color: colors.accent.primary,
            },
          },
        },
      },
      
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: colors.accent.primary,
            height: 3,
            borderRadius: '2px 2px 0 0',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.secondary,
            border: `1px solid ${colors.border}`,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: colors.text.primary,
            '&:hover': {
              backgroundColor: colors.hover,
            },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.secondary,
            border: `1px solid ${colors.border}`,
          },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 52,
            height: 32,
            padding: 0,
            '& .MuiSwitch-switchBase': {
              padding: 0,
              margin: 2,
              transitionDuration: '300ms',
              '&.Mui-checked': {
                transform: 'translateX(20px)',
                color: '#fff',
                '& + .MuiSwitch-track': {
                  opacity: 1,
                  border: 0,
                },
                '&.Mui-disabled + .MuiSwitch-track': {
                  opacity: 0.5,
                },
              },
              '&.Mui-focusVisible .MuiSwitch-thumb': {
                color: colors.accent.primary,
                border: `6px solid ${colors.primary}`,
              },
              '&.Mui-disabled .MuiSwitch-thumb': {
                color: colors.text.disabled,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.3,
              },
            },
            '& .MuiSwitch-thumb': {
              boxSizing: 'border-box',
              width: 28,
              height: 28,
              boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease-in-out',
            },
            '& .MuiSwitch-track': {
              borderRadius: 32 / 2,
              backgroundColor: colors.border,
              opacity: 1,
              transition: 'all 0.3s ease-in-out',
            },
          },
        },
      },

      MuiFormControlLabel: {
        styleOverrides: {
          root: {
            margin: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.text.secondary,
            },
          },
        },
      },
    },
    
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  });
};

// Create the context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('dark');
  
  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('taskara-theme');
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('taskara-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = createAppTheme(
    themeMode,
    themeMode === 'light' ? lightColors : darkColors
  );

  const value = {
    themeMode,
    toggleTheme,
    theme,
    isDark: themeMode === 'dark',
    isLight: themeMode === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;