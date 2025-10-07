# Theme System Documentation

## Overview
The Taskara application now includes a comprehensive theme system that supports both light and dark modes with seamless switching capabilities.

## Features
- 🌙 **Dark Mode**: Default theme with dark backgrounds and high contrast
- ☀️ **Light Mode**: Clean light theme with bright backgrounds
- 🔄 **Theme Toggle**: Easy switching via settings dropdown
- 💾 **Persistence**: User preferences saved to localStorage
- 🎨 **Consistent Styling**: All Material-UI components properly themed

## Implementation Details

### Theme Context (`/src/contexts/ThemeContext.jsx`)
- Manages global theme state
- Provides theme switching functionality
- Handles localStorage persistence
- Creates Material-UI themes for both modes

### Key Components
- **ThemeProvider**: Wraps the entire application
- **useTheme hook**: Access theme state and functions
- **ThemeToggleMenuItem**: Reusable theme toggle component

### Usage in Components

```jsx
import { useTheme } from '../../contexts/ThemeContext.jsx';

const MyComponent = () => {
  const { themeMode, toggleTheme, isDark, isLight, theme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {themeMode}</p>
      <button onClick={toggleTheme}>
        Switch to {isDark ? 'light' : 'dark'} theme
      </button>
    </div>
  );
};
```

### Theme Toggle in Menus

Import and use the reusable `ThemeToggleMenuItem` component:

```jsx
import ThemeToggleMenuItem from '../../components/common/ThemeToggleMenuItem.jsx';

// In your menu component
<Menu>
  <MenuItem>Profile</MenuItem>
  <MenuItem>Settings</MenuItem>
  <ThemeToggleMenuItem />
  <MenuItem>Logout</MenuItem>
</Menu>
```

## Color Schemes

### Dark Theme
- Primary background: `#181824`
- Secondary background: `#232136`
- Surface: `#1e1b2e`
- Text primary: `#ffffff`
- Text secondary: `#e2e8f0`

### Light Theme
- Primary background: `#f8fafc`
- Secondary background: `#ffffff`
- Surface: `#ffffff`
- Text primary: `#1e293b`
- Text secondary: `#475569`

### Common Colors (Both Themes)
- Purple accent: `#a259ff`
- Success: `#10b981`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Info: `#3b82f6`

## Customization

### Adding New Colors
Edit the `lightColors` and `darkColors` objects in `ThemeContext.jsx`:

```jsx
const darkColors = {
  // Add your custom colors here
  customColor: '#your-color',
  // ...existing colors
};
```

### Component Styling
The theme automatically applies to all Material-UI components. For custom styling:

```jsx
import { useTheme } from '@mui/material/styles';

const MyStyledComponent = () => {
  const theme = useTheme();
  
  return (
    <Box 
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      Content
    </Box>
  );
};
```

## Browser Support
- Theme preferences persist across browser sessions
- Automatic fallback to dark theme if localStorage is unavailable
- Compatible with all modern browsers

## Files Modified
- `/src/contexts/ThemeContext.jsx` - New theme context
- `/src/main.jsx` - Updated to use new ThemeProvider
- `/src/pages/dashboard/AdminDashboard.jsx` - Added theme toggle
- `/src/pages/dashboard/DashboardPage.jsx` - Added theme toggle
- `/src/components/common/ThemeToggleMenuItem.jsx` - Reusable component

## Testing
1. Open the application
2. Click on user menu (profile icon with dropdown)
3. Look for "Theme" option with light/dark switch
4. Toggle between themes and verify:
   - Colors change immediately
   - Preference persists after page refresh
   - All components adapt properly

The theme system is now fully integrated and ready for use across the entire application!