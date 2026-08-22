import { useState } from 'react';
import { Search, X } from 'lucide-react';
import './components.css';

export default function SearchBar({ value, onChange, placeholder = 'Search...', onSubmit, id }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`search-bar ${focused ? 'search-bar--focused' : ''}`}>
      <Search size={16} color="var(--color-text-muted)" />
      <input
        id={id || 'search-bar-input'}
        className="search-bar__input"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && onSubmit && onSubmit(value)}
        aria-label={placeholder}
      />
      {value && (
        <button onClick={() => onChange && onChange('')} aria-label="Clear" style={{ display: 'flex', alignItems: 'center' }}>
          <X size={14} color="var(--color-text-muted)" />
        </button>
      )}
    </div>
  );
}
