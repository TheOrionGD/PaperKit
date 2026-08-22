import { useEffect } from 'react';
import './components.css';

export default function Toast({ message, type = 'default', onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismiss && onDismiss(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`toast toast--${type}`}
      role="alert"
      aria-live="polite"
      onClick={onDismiss}
    >
      {message}
    </div>
  );
}
