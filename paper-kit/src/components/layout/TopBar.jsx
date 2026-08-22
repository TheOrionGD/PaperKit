/* TopBar — the main home header with PaperKit branding */


import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ onMenuOpen }) {
  
  const navigate = useNavigate();

  
  return (
    <header className="topbar" role="banner">
      <div className="topbar__row">
        <button
          className="topbar__icon-btn"
          onClick={onMenuOpen}
          aria-label="Open menu"
          id="topbar-menu-btn"
        >
          <Menu size={22} color="var(--color-text-secondary)" />
        </button>

        <div className="topbar__brand" onClick={() => navigate('/')} role="link" tabIndex={0}>
          {/* PaperKit P Logo */}
          <div className="topbar__logo-mark" aria-hidden="true">
            <img src="/icon-48.png" alt="PaperKit Logo" width="28" height="28" style={{ borderRadius: '6px' }} />
          </div>
          <div className="topbar__brand-text">
            <span className="topbar__brand-name">PaperKit</span>
            <span className="topbar__brand-tagline">All-in-One PDF Solution</span>
          </div>
        </div>

      </div>
    </header>
  );
}
