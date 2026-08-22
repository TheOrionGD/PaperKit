import './components.css';

export default function SelectField({ label, value, onChange, options, id }) {
  return (
    <div className="select-field">
      {label && <span className="select-field__label">{label}</span>}
      <select
        id={id}
        className="select-field__select"
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        aria-label={label}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
