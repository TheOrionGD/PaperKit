import './components.css';

export default function SegmentedControl({ options, activeOption, onSelect, id }) {
  return (
    <div className="segmented-control" role="group" aria-label="Options">
      {options.map(opt => (
        <button
          key={opt.id}
          id={`${id || 'seg'}-${opt.id}`}
          className={`segmented-control__option ${activeOption === opt.id ? 'segmented-control__option--active' : ''}`}
          onClick={() => onSelect && onSelect(opt.id)}
          role="radio"
          aria-checked={activeOption === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
