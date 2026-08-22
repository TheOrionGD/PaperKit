import { useNavigate } from 'react-router-dom';
import { TOOL_ICON_MAP } from '../icons/ToolIcons';
import './components.css';

export default function ToolCard({ tool, size }) {
  const navigate = useNavigate();
  const IconComponent = TOOL_ICON_MAP[tool.id];

  function handleClick() {
    if (tool.path) navigate(tool.path);
  }

  return (
    <div
      className="tool-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      id={`tool-card-${tool.id}`}
      aria-label={tool.label}
      title={tool.description || tool.label}
    >
      {IconComponent ? (
        <IconComponent size={size || 44} />
      ) : (
        <div style={{
          width: size || 44,
          height: size || 44,
          borderRadius: 10,
          background: 'var(--color-divider)',
        }} />
      )}
      <span className="tool-card__label">{tool.label}</span>
    </div>
  );
}
