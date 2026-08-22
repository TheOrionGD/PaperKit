import './components.css';

export default function RadioOption({ label, sublabel, selected, onSelect, id }) {
  return (
    <div
      className={`radio-option ${selected ? 'radio-option--selected' : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      id={id}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect && onSelect()}
    >
      <div className="radio-option__content">
        <div className="radio-option__label">{label}</div>
        {sublabel && <div className="radio-option__sublabel">{sublabel}</div>}
      </div>
      <div className="radio-option__circle">
        <div className="radio-option__dot" />
      </div>
    </div>
  );
}
