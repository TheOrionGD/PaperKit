import ToolGrid from './ToolGrid';
import './components.css';

export default function ToolCategory({ title, tools, onViewAll, showViewAll = false }) {
  return (
    <div className="tool-category">
      <div className="tool-category__header">
        <h2 className="tool-category__title">{title}</h2>
        {showViewAll && onViewAll && (
          <button className="tool-category__view-all" onClick={onViewAll} id={`view-all-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            View All
          </button>
        )}
      </div>
      <ToolGrid tools={tools} />
    </div>
  );
}
