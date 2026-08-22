import { FolderOpen } from 'lucide-react';
import './components.css';

export default function EmptyState({ icon: IconComp, title, description, action }) {
  const Icon = IconComp || FolderOpen;
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon size={30} color="var(--color-text-muted)" />
      </div>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  );
}
