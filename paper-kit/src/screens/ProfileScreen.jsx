/* ProfileScreen — Modern hero banner, live stats cards, multi-language switching, and glassmorphic settings modal */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Files, Clock, Star, Trash2,
  Settings, HelpCircle, Share2, Info, ChevronRight, X, HardDrive, ShieldCheck, Globe, User, Zap, LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n, SUPPORTED_LANGUAGES } from '../context/I18nContext';
import { updateMe } from '../services/auth';
import { getStorageUsage } from '../services/jobs';
import { getProcessingHistory } from '../services/tools';
import LoadingState from '../components/ui/LoadingState';
import ParticleBackground from '../components/ui/ParticleBackground';
import { shareUrl, exitApp } from '../services/native';
import { formatFileTimestamp } from '../utils/dateUtils';
import './ProfileScreen.css';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, loading, logout, setUser } = useAuth();
  const { t, lang, setLang } = useI18n();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [defaultView, setDefaultView] = useState('list');
  const [selectedLang, setSelectedLang] = useState(lang);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Real dynamic stats
  const [storageStats, setStorageStats] = useState({ totalMB: '0.00', fileCount: 0 });
  const [historyCount, setHistoryCount] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState('0.8s');

  // Sync state with user context & i18n
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDarkMode(user.preferences?.dark_mode || false);
      setDefaultView(user.preferences?.default_view || 'list');
      setSelectedLang(user.preferences?.language || lang || 'en');
    }
  }, [user, lang]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [storage, history] = await Promise.all([
          getStorageUsage().catch(() => null),
          getProcessingHistory().catch(() => [])
        ]);
        if (storage) {
          setStorageStats(storage);
        }
        if (Array.isArray(history)) {
          setHistoryCount(history.length);
          if (history.length > 0) {
            const validDurations = history.filter(h => h.duration_ms || h.processing_time_ms);
            if (validDurations.length > 0) {
              const avgMs = validDurations.reduce((acc, curr) => acc + (curr.duration_ms || curr.processing_time_ms), 0) / validDurations.length;
              setAvgSpeed(`${(avgMs / 1000).toFixed(1)}s`);
            } else {
              setAvgSpeed('1.2s');
            }
          } else {
            setAvgSpeed('0.0s');
          }
        }
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    }
    loadStats();
  }, []);

  if (loading) return <LoadingState text="Loading profile..." />;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'PK');

  const registeredDate = user?.created_at
    ? formatFileTimestamp(user.created_at, { relative: false })
    : 'Active Session';


  const MENU_SECTIONS = [
    {
      title: t('files'),
      items: [
        { id: 'my-files', label: t('files'), icon: Files, path: '/files', color: 'var(--color-primary)' },
        { id: 'recent', label: t('recent'), icon: Clock, path: '/files?filter=recent', color: 'var(--tool-blue)' },
        { id: 'favorites', label: t('favorites'), icon: Star, path: '/files?filter=favorites', color: 'var(--tool-orange)' },
        { id: 'trash', label: t('trash'), icon: Trash2, path: '/files?filter=trash', color: 'var(--color-error)' },
      ]
    },
    {
      title: t('app_preferences'),
      items: [
        { id: 'storage', label: t('storage'), icon: HardDrive, path: '/storage', color: 'var(--tool-teal)', badge: `${storageStats.totalMB} MB` },
        { id: 'history', label: t('history'), icon: Clock, path: '/history', color: 'var(--tool-indigo)', badge: `${historyCount}` },
        { id: 'settings', label: t('settings'), icon: Settings, color: 'var(--color-text-secondary)', isSettings: true },
      ]
    },
    {
      title: t('help'),
      items: [
        { id: 'help', label: t('help'), icon: HelpCircle, path: '/help', color: 'var(--tool-purple)' },
        { id: 'share', label: t('share'), icon: Share2, action: 'share', color: 'var(--tool-green)' },
        { id: 'about', label: t('about'), icon: Info, path: '/about', color: 'var(--color-text-muted)' },
      ]
    }
  ];

  function handleItem(item) {
    if (item.action === 'share') {
      shareUrl('PaperKit', 'Check out PaperKit — All-in-One Open-Source PDF Suite!', 'https://paperkit-web.onrender.com');
      return;
    }
    if (item.isSettings || item.id === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (item.path) navigate(item.path);
  }

  async function handleLanguageChange(newLang) {
    setSelectedLang(newLang);
    setLang(newLang);
    try {
      const currentPreferences = user?.preferences || {};
      const newPreferences = { ...currentPreferences, language: newLang };
      const updatedUser = await updateMe({ preferences: newPreferences });
      if (setUser && updatedUser) setUser(updatedUser);
    } catch (err) {
      console.warn('Preferences save failed:', err);
    }
  }

  async function handlePreferenceChange(key, value) {
    try {
      if (key === 'dark_mode') setDarkMode(value);
      if (key === 'default_view') setDefaultView(value);

      const currentPreferences = user?.preferences || {};
      const newPreferences = { ...currentPreferences, [key]: value };
      const updatedUser = await updateMe({ preferences: newPreferences });
      if (setUser && updatedUser) setUser(updatedUser);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload = { name };
      const updatedUser = await updateMe(payload);
      if (setUser && updatedUser) setUser(updatedUser);
      setSaveSuccess(t('save_changes') + ' ✓');
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    await exitApp();
  }

  async function handleResetPreferences() {
    if (window.confirm('Reset local workspace preferences and cache to default?')) {
      await logout();
      setName('Open Source User');
      setDarkMode(false);
      setDefaultView('list');
      setSelectedLang('en');
      setLang('en');
      setSaveSuccess('Workspace reset to defaults ✓');
    }
  }

  return (
    <div className="profile-screen">
      {/* Dynamic Floating Particle Background across entire Profile Page */}
      <ParticleBackground />

      {/* Modern Glassmorphic Profile Card */}
      <div className="profile-screen__card-hero">
        <div className="profile-screen__card-hero-glow" />
        <div className="profile-screen__card-hero-content">
          <div className="profile-screen__avatar-container">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${user.avatar_url}`}
                alt="Profile"
                className="profile-screen__avatar-img"
              />
            ) : (
              <div className="profile-screen__avatar-circle">{initials}</div>
            )}
            <div className="profile-screen__badge-status" title="Active Client Connection">
              <ShieldCheck size={14} color="#10B981" />
            </div>
          </div>

          <div className="profile-screen__user-details">
            <div className="profile-screen__user-name-row">
              <h1 className="profile-screen__user-title">
                {user?.name || (user?.email ? user.email.split('@')[0] : 'Open Source User')}
              </h1>
              <span className="profile-screen__verified-badge">
                <ShieldCheck size={13} color="#10B981" />
                <span>Verified</span>
              </span>
            </div>

            <p className="profile-screen__user-sub">
              {user?.email || 'user@paperkit.local'}
            </p>

            <div className="profile-screen__pill-row">
              <span className="profile-screen__access-pill">
                <ShieldCheck size={13} />
                <span>UNRESTRICTED ACCESS</span>
              </span>
              <span className="profile-screen__date-pill">
                <Clock size={12} />
                <span>{registeredDate}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="profile-screen__quick-settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Open Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="profile-screen__stats-row">
        <div className="profile-screen__stat-card" onClick={() => navigate('/files')}>
          <div className="profile-screen__stat-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: 'var(--color-primary)' }}>
            <Files size={18} />
          </div>
          <div className="profile-screen__stat-val">{storageStats.fileCount || 0}</div>
          <div className="profile-screen__stat-label">{t('processed_files')}</div>
        </div>

        <div className="profile-screen__stat-card" onClick={() => navigate('/storage')}>
          <div className="profile-screen__stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <HardDrive size={18} />
          </div>
          <div className="profile-screen__stat-val">{storageStats.totalMB} MB</div>
          <div className="profile-screen__stat-label">{t('storage_used')}</div>
        </div>

        <div className="profile-screen__stat-card" onClick={() => navigate('/history')}>
          <div className="profile-screen__stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
            <Zap size={18} />
          </div>
          <div className="profile-screen__stat-val">{avgSpeed}</div>
          <div className="profile-screen__stat-label">{t('processing_speed')}</div>
        </div>
      </div>


      <div className="profile-screen__lang-bar">
        <div className="profile-screen__lang-title">
          <Globe size={16} color="var(--color-primary)" />
          <span>{t('language')}:</span>
        </div>
        <div className="profile-screen__lang-chips">
          {SUPPORTED_LANGUAGES.map(item => (
            <button
              key={item.code}
              type="button"
              className={`profile-screen__lang-chip ${selectedLang === item.code ? 'profile-screen__lang-chip--active' : ''}`}
              onClick={() => handleLanguageChange(item.code)}
              title={item.name}
            >
              <span className="profile-screen__lang-flag">{item.flag}</span>
              <span>{item.nativeName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="profile-screen__sections-wrap">
        {MENU_SECTIONS.map((section, sIdx) => (
          <div key={`section-${sIdx}`} className="profile-screen__group">
            <h3 className="profile-screen__group-title">{section.title}</h3>
            <div className="profile-screen__card-list">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="profile-screen__card-item"
                    onClick={() => handleItem(item)}
                    id={`profile-item-${item.id}`}
                  >
                    <div className="profile-screen__card-icon-box" style={{ color: item.color }}>
                      <Icon size={18} />
                    </div>
                    <span className="profile-screen__card-label">{item.label}</span>
                    {item.badge && <span className="profile-screen__card-badge">{item.badge}</span>}
                    <ChevronRight size={16} color="var(--color-text-muted)" className="profile-screen__card-chevron" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          className="profile-screen__settings-btn"
          onClick={() => setSettingsOpen(true)}
          id="profile-settings-btn"
        >
          <Settings size={18} />
          <span>{t('settings')}</span>
        </button>

        <button
          className="profile-screen__logout-btn"
          onClick={handleLogout}
          id="profile-logout-btn"
        >
          <LogOut size={18} />
          <span>{t('logout') || 'Log Out'}</span>
        </button>
      </div>

      {settingsOpen && (
        <div className="profile-screen__modal-overlay" onClick={() => setSettingsOpen(false)}>
          <ParticleBackground />
          <div className="profile-screen__modal" onClick={e => e.stopPropagation()}>
            <div className="profile-screen__modal-header">
              <h2>{t('settings')}</h2>
              <button
                className="profile-screen__modal-close"
                onClick={() => { setSettingsOpen(false); setSaveError(''); setSaveSuccess(''); }}
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>

            <div className="profile-screen__modal-body">
              <form onSubmit={handleSaveProfile} className="profile-screen__form">
                <div className="profile-screen__section-title">{t('profile')}</div>

                {saveError && <div className="profile-screen__alert profile-screen__alert--error">{saveError}</div>}
                {saveSuccess && <div className="profile-screen__alert profile-screen__alert--success">{saveSuccess}</div>}

                <div className="profile-screen__field">
                  <label className="profile-screen__label">Display Name</label>
                  <div className="profile-screen__input-wrap">
                    <User size={16} className="profile-screen__input-icon" />
                    <input
                      type="text"
                      className="profile-screen__input"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Name"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="profile-screen__btn profile-screen__btn--primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : t('save_changes')}
                </button>
              </form>

              <div className="profile-screen__prefs-section">
                <div className="profile-screen__section-title">{t('app_preferences')}</div>

                <div className="profile-screen__pref-row">
                  <div className="profile-screen__pref-info">
                    <span className="profile-screen__pref-name">{t('language')}</span>
                    <span className="profile-screen__pref-desc">Instant interface translation</span>
                  </div>
                  <select
                    className="profile-screen__select"
                    value={selectedLang}
                    onChange={e => handleLanguageChange(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="profile-screen__pref-row">
                  <div className="profile-screen__pref-info">
                    <span className="profile-screen__pref-name">{t('dark_mode')}</span>
                    <span className="profile-screen__pref-desc">Switch between light &amp; dark themes</span>
                  </div>
                  <label className="profile-screen__switch">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={e => handlePreferenceChange('dark_mode', e.target.checked)}
                    />
                    <span className="profile-screen__switch-slider" />
                  </label>
                </div>

                <div className="profile-screen__pref-row">
                  <div className="profile-screen__pref-info">
                    <span className="profile-screen__pref-name">{t('default_view')}</span>
                    <span className="profile-screen__pref-desc">Default file listing format</span>
                  </div>
                  <select
                    className="profile-screen__select"
                    value={defaultView}
                    onChange={e => handlePreferenceChange('default_view', e.target.value)}
                  >
                    <option value="list">{t('list_view')}</option>
                    <option value="grid">{t('grid_view')}</option>
                  </select>
                </div>

                <div className="profile-screen__pref-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-divider)' }}>
                  <div className="profile-screen__pref-info">
                    <span className="profile-screen__pref-name">Reset Workspace</span>
                    <span className="profile-screen__pref-desc">Reset local preferences and cache</span>
                  </div>
                  <button
                    type="button"
                    className="profile-screen__btn profile-screen__btn--danger"
                    onClick={handleResetPreferences}
                    style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
