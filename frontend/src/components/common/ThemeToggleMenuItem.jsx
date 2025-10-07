import React from 'react';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const ThemeToggleMenuItem = () => {
  const { themeMode, toggleTheme, isDark } = useTheme();

  return (
    <>
      <Divider />
      <MenuItem onClick={(e) => { e.stopPropagation(); }}>
        <ListItemIcon>
          {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </ListItemIcon>
        <ListItemText>Theme</ListItemText>
        <FormControlLabel
          control={
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              size="small"
              color="primary"
            />
          }
          label={isDark ? 'Dark' : 'Light'}
          labelPlacement="start"
          sx={{ 
            ml: 1, 
            mr: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.75rem',
              color: 'text.secondary',
            }
          }}
        />
      </MenuItem>
    </>
  );
};

export default ThemeToggleMenuItem;