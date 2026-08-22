/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BackHeader from './BackHeader';
import BottomNavigation from './BottomNavigation';
import NavigationDrawer from './NavigationDrawer';
import { ProcessingProvider } from '../../context/ProcessingContext';
import './AppShell.css';

/* Routes that use the home TopBar (logo + search) */
const TOP_BAR_ROUTES = ['/', '/files', '/profile'];

/* Routes that hide the BottomNavigation */
const NO_BOTTOM_NAV_ROUTES = ['/scanner', '/login', '/register'];

export const SearchContext = createContext({ query: '', setQuery: () => {} });

export default function AppShell({ children, headerProps }) {
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showTopBar = TOP_BAR_ROUTES.includes(pathname);
  const showBottomNav = !NO_BOTTOM_NAV_ROUTES.some(r => pathname.startsWith(r));
  const _showBackHeader = !showTopBar && showBottomNav;
  const isFullScreen = NO_BOTTOM_NAV_ROUTES.some(r => pathname.startsWith(r));

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      <ProcessingProvider>
        <div className="app-shell">
          {isFullScreen ? null : showTopBar ? (
            <TopBar onSearch={setQuery} onMenuOpen={() => setDrawerOpen(true)} />
          ) : (
            <BackHeader {...headerProps} />
          )}

          <NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <main
            className="app-shell__content"
            style={isFullScreen ? { paddingTop: 0, paddingBottom: 0 } : undefined}
          >
            <div key={pathname} className="page-transition">
              {children}
            </div>
          </main>

          {showBottomNav && <BottomNavigation />}
        </div>
      </ProcessingProvider>
    </SearchContext.Provider>
  );
}
