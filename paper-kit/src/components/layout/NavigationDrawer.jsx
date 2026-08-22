import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Files, Clock, Star, Trash2, Settings, 
  HelpCircle, Share2, Info, X, LogOut, ChevronRight, Crown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';
import { shareUrl } from '../../services/native';
import './NavigationDrawer.css';

export default function NavigationDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'PK';

  const menuItems = [
    { id: 'my-files',     label: t('files') || 'My Files',         icon: Files,      path: '/files' },
    { id: 'recent',       label: t('recent') || 'Recent Files',    icon: Clock,      path: '/files?filter=recent' },
    { id: 'favorites',    label: t('favorites') || 'Favorites',    icon: Star,       path: '/files?filter=favorites' },
    { id: 'trash',        label: t('trash') || 'Trash',            icon: Trash2,     path: '/files?filter=trash' },
    { id: 'settings',     label: t('settings') || 'Settings',      icon: Settings,   path: '/profile' },
    { id: 'help',         label: t('help') || 'Help & Support',    icon: HelpCircle, path: '/help' },
    { id: 'share',        label: t('share') || 'Share PaperKit',   icon: Share2,     action: 'share' },
    { id: 'about',        label: t('about') || 'About PaperKit',   icon: Info,       path: '/about' },
  ];

  function handleItemClick(item) {
    onClose();
    if (item.action === 'share') {
      shareUrl('PaperKit', 'Check out PaperKit — All-in-One PDF & Media Solution!', window.location.origin);
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  }

  async function handleLogout() {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation Menu">
      {/* Backdrop overlay */}
      <div className="nav-drawer__overlay" onClick={onClose} aria-hidden="true" />
      
      {/* Drawer content sliding from left within the app shell */}
      <div className="nav-drawer__content" onClick={(e) => e.stopPropagation()}>
        {/* Header Profile Section */}
        <div className="nav-drawer__header">
          <button className="nav-drawer__close-btn" onClick={onClose} aria-label="Close menu" id="drawer-close-btn">
            <X size={18} color="white" />
          </button>
          
          <div className="nav-drawer__profile" onClick={() => { onClose(); navigate('/profile'); }} role="button" tabIndex={0}>
            <div className="nav-drawer__avatar">{initials}</div>
            <div className="nav-drawer__user-details">
              <h2 className="nav-drawer__user-name">{user?.name || 'My Workspace'}</h2>
              <p className="nav-drawer__user-email">{user?.email || 'PaperKit Studio'}</p>
              <div className="nav-drawer__workspace-badge">
                <ShieldCheck size={11} style={{ marginRight: '3px' }} />
                <span>UNRESTRICTED STUDIO</span>
              </div>
            </div>
          </div>
        </div>


        {/* List of menu options */}
        <nav className="nav-drawer__menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="nav-drawer__menu-item"
                onClick={() => handleItemClick(item)}
                id={`drawer-menu-${item.id}`}
              >
                <div className="nav-drawer__menu-icon-wrapper">
                  <Icon size={18} color="var(--color-primary)" />
                </div>
                <span className="nav-drawer__menu-label">{item.label}</span>
                <ChevronRight size={16} color="var(--color-text-muted)" className="nav-drawer__chevron" />
              </button>
            );
          })}

          <div className="nav-drawer__divider" />

          <button
            className="nav-drawer__menu-item nav-drawer__menu-item--logout"
            onClick={handleLogout}
            id="drawer-logout-btn"
          >
            <div className="nav-drawer__menu-icon-wrapper nav-drawer__menu-icon-wrapper--logout">
              <LogOut size={18} color="var(--color-error)" />
            </div>
            <span className="nav-drawer__menu-label" style={{ color: 'var(--color-error)', fontWeight: 600 }}>
              {t('logout') || 'Sign Out'}
            </span>
          </button>
        </nav>

        {/* Footer info */}
        <div className="nav-drawer__footer">
          <span>PaperKit v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

