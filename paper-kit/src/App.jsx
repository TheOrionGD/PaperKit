import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { I18nProvider } from './context/I18nContext';
import { prewarmBackend } from './services/api';
import { configureStatusBar } from './services/native';
import AppRouter from './router/index';
import './index.css';

function ThemeApp() {
  const { user } = useAuth();

  useEffect(() => {
    prewarmBackend();
    configureStatusBar(false);
  }, []);

  useEffect(() => {
    const isDark = Boolean(user?.preferences?.dark_mode);
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (user?.preferences?.language) {
      document.documentElement.lang = user.preferences.language;
    }
    configureStatusBar(isDark);
  }, [user]);

  return (
    <I18nProvider>
      <AppRouter />
    </I18nProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
