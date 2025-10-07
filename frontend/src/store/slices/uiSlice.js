import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  version: 2, // Increment this when making breaking changes to viewPreferences
  viewPreferences: {
    epics: 'table',
    stories: 'table', 
    tasks: 'table',
    subtasks: 'table',
  },
  sidebarCollapsed: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Add a migration action that can be called on app startup
    migrateUIState: (state) => {
      // If no version or version is less than current, reset viewPreferences
      if (!state.version || state.version < initialState.version) {
        state.version = initialState.version;
        state.viewPreferences = { ...initialState.viewPreferences };
      }
    },
    setViewPreference: (state, action) => {
      const { itemType, view } = action.payload;
      if (state.viewPreferences.hasOwnProperty(itemType)) {
        state.viewPreferences[itemType] = view;
      }
    },
    setAllViewPreferences: (state, action) => {
      const { view } = action.payload;
      Object.keys(state.viewPreferences).forEach(key => {
        state.viewPreferences[key] = view;
      });
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    resetUI: () => initialState,
  },
});

export const {
  migrateUIState,
  setViewPreference,
  setAllViewPreferences,
  setSidebarCollapsed,
  setTheme,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;