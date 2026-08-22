import './components.css';

export default function FilterTabs({ tabs, activeTab, onTabChange, id }) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filter options">
      {tabs.map(tab => (
        <button
          key={tab.id}
          id={`${id || 'filter-tab'}-${tab.id}`}
          className={`filter-tab ${activeTab === tab.id ? 'filter-tab--active' : ''}`}
          onClick={() => onTabChange && onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
