import './components.css';

export function PrimaryButton({ children, onClick, disabled, loading, type = 'button', id, className = '' }) {
  return (
    <button
      id={id}
      type={type}
      className={`btn-primary ${loading ? 'btn-primary--loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, type = 'button', id, className = '' }) {
  return (
    <button
      id={id}
      type={type}
      className={`btn-secondary ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
