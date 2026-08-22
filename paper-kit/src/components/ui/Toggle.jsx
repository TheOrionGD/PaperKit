import './components.css';

export default function Toggle({ checked, onChange, id, label, disabled }) {
  return (
    <label className="toggle" title={label} aria-label={label}>
      <input
        id={id}
        className="toggle__input"
        type="checkbox"
        checked={checked}
        onChange={e => onChange && onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />
      <span className="toggle__slider" />
    </label>
  );
}
