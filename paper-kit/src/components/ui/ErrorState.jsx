import { AlertCircle } from 'lucide-react';
import { PrimaryButton } from './Button';
import './components.css';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state__icon">
        <AlertCircle size={28} color="var(--color-error)" />
      </div>
      <p className="error-state__title">{title}</p>
      {message && <p className="error-state__message">{message}</p>}
      {onRetry && (
        <PrimaryButton onClick={onRetry} id="error-retry-btn" style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }}>
          Try Again
        </PrimaryButton>
      )}
    </div>
  );
}
