import './components.css';

export default function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="loading-state__capsule">
        <div className="loading-spinner" />
        <p className="loading-state__text">{text}</p>
      </div>
    </div>
  );
}

