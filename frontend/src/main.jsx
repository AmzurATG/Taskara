import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { store } from './store/index.js';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import './styles/animations.css';

// App wrapper component to access theme context
const AppWrapper = () => {
  const { theme } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: theme.palette.success.main,
              secondary: theme.palette.background.paper,
            },
          },
          error: {
            iconTheme: {
              primary: theme.palette.error.main,
              secondary: theme.palette.background.paper,
            },
          },
        }}
      />
    </MuiThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <AppWrapper />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);