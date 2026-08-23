/* eslint-disable react-refresh/only-export-components */
/* useAuth.jsx — Open-Source Local User & Preferences Context.
   Zero authentication barrier: provides immediate access and manages local preferences. */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LOCAL_USER_KEY = 'pk_local_user';

const DEFAULT_USER = {
  _id: 'local_user',
  name: 'Open Source User',
  email: 'user@paperkit.local',
  created_at: new Date().toISOString(),
  preferences: {
    dark_mode: false,
    default_view: 'list',
    language: 'en',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });
  const [loading] = useState(false);
  const [error] = useState(null);

  /* Save user preferences to localStorage */
  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    }
  }, [user]);

  /* Sync user preferences dark mode theme */
  useEffect(() => {
    if (user?.preferences?.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user]);

  const updatePreferences = useCallback((newPrefs) => {
    setUser((prev) => ({
      ...prev,
      preferences: {
        ...(prev?.preferences || {}),
        ...newPrefs,
      },
    }));
  }, []);

  const login = useCallback(async () => user, [user]);
  const register = useCallback(async () => user, [user]);
  const logout = useCallback(async () => {
    localStorage.removeItem(LOCAL_USER_KEY);
    setUser(DEFAULT_USER);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        setUser,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
