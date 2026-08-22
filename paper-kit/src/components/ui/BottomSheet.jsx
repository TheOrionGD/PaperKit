import { useEffect, useRef } from 'react';
import './components.css';

export default function BottomSheet({ open, onClose, children, title }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose && onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="bottom-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet__handle" />
        {title && (
          <div style={{ padding: '0 var(--space-4) var(--space-4)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)' }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
