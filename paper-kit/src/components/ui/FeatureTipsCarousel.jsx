import { Info } from 'lucide-react';
import './FeatureTipsCarousel.css';

export default function FeatureTipsCarousel({ tips = [] }) {
  if (!tips || tips.length === 0) return null;

  return (
    <div className="feature-tips-carousel">
      <div className="feature-tips-carousel__header">
        <Info size={16} />
        <span>How it works</span>
      </div>
      <div className="feature-tips-carousel__track">
        {tips.map((tip, idx) => (
          <div key={idx} className="feature-tips-carousel__card glass-card">
            {tip.icon && <div className="feature-tips-carousel__icon">{tip.icon}</div>}
            <div className="feature-tips-carousel__content">
              <h4 className="feature-tips-carousel__title">{tip.title}</h4>
              <p className="feature-tips-carousel__desc">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
