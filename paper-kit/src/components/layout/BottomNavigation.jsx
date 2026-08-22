/* BottomNavigation — 5-slot bottom nav matching the reference.
   Slots: Home | Tools | [Camera FAB] | Files | Settings
   Active state driven by router location. */

import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid2X2, Files, Settings, Camera } from 'lucide-react';
import './BottomNavigation.css';

const NAV_ITEMS = [
  { id: 'home',     label: 'Home',     icon: Home,      path: '/' },
  { id: 'tools',    label: 'Tools',    icon: Grid2X2,   path: '/tools' },
  { id: 'scanner',  label: null,       icon: Camera,    path: '/scanner', isFab: true },
  { id: 'files',    label: 'Files',    icon: Files,     path: '/files' },
  { id: 'settings', label: 'Settings', icon: Settings,  path: '/profile' },
];

export default function BottomNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function isActive(item) {
    if (item.path === '/') return pathname === '/';
    return pathname.startsWith(item.path);
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const active = isActive(item);

        if (item.isFab) {
          return (
            <button
              key={item.id}
              className="bottom-nav__fab"
              onClick={() => navigate(item.path)}
              aria-label="Open Smart Scanner"
              id={`bottom-nav-${item.id}`}
            >
              <Icon size={26} color="white" strokeWidth={2} />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            id={`bottom-nav-${item.id}`}
          >
            <Icon
              size={22}
              color={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
              strokeWidth={active ? 2.5 : 2}
            />
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
