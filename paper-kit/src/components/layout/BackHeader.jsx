/* BackHeader — header for tool/detail screens.
   Shows back chevron, centered title, optional right action. */

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap, Check } from 'lucide-react';
import './BackHeader.css';

export default function BackHeader({
  title = '',
  rightAction,        // 'check' | 'flash' | null | ReactNode
  onRightAction,
  onBack,
}) {
  const navigate = useNavigate();

  function handleBack() {
    if (onBack) onBack();
    else navigate(-1);
  }

  function renderRight() {
    if (!rightAction) return <div className="back-header__side" />;
    if (rightAction === 'check') {
      return (
        <button
          className="back-header__right-btn back-header__right-btn--check"
          onClick={onRightAction}
          aria-label="Confirm"
          id="back-header-confirm-btn"
        >
          <Check size={20} />
        </button>
      );
    }
    if (rightAction === 'flash') {
      return (
        <button
          className="back-header__right-btn back-header__right-btn--icon"
          onClick={onRightAction}
          aria-label="Toggle flash"
          id="back-header-flash-btn"
        >
          <Zap size={20} color="var(--color-warning)" />
        </button>
      );
    }
    if (typeof rightAction === 'string') {
      return (
        <button
          className="back-header__right-btn back-header__right-btn--text"
          onClick={onRightAction}
          id="back-header-action-btn"
        >
          {rightAction}
        </button>
      );
    }
    return <div className="back-header__side">{rightAction}</div>;
  }

  return (
    <header className="back-header" role="banner">
      <button
        className="back-header__back-btn"
        onClick={handleBack}
        aria-label="Go back"
        id="back-header-back-btn"
      >
        <ChevronLeft size={22} color="var(--color-text-primary)" />
      </button>

      <h1 className="back-header__title">{title}</h1>

      {renderRight()}
    </header>
  );
}
