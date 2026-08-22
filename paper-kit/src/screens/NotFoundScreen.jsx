import { useNavigate } from 'react-router-dom';
import { Home, Compass, ArrowLeft, Search, Sparkles, FileText } from 'lucide-react';
import './NotFoundScreen.css';

export default function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div className="not-found-screen">
      <div className="not-found-screen__bg-glow" />
      
      <div className="not-found-screen__glass-card">
        {/* Top pill badge */}
        <div className="not-found-screen__pill-badge">
          <Sparkles size={13} color="#2563EB" />
          <span>Error 404 • Page Not Found</span>
        </div>

        {/* Big Frosted 404 Typography */}
        <div className="not-found-screen__code-wrap">
          <span className="not-found-screen__code">404</span>
          <div className="not-found-screen__code-blur">404</div>
        </div>

        <h1 className="not-found-screen__title">Lost in the mist?</h1>
        <p className="not-found-screen__subtitle">
          The document or workstation you're looking for doesn't exist or has been relocated.
        </p>

        {/* Quick Frosted Search / Discovery Box */}
        <div 
          className="not-found-screen__search-pill"
          onClick={() => navigate('/tools')}
          role="button"
          tabIndex={0}
        >
          <Search size={16} color="#64748B" />
          <span>Search 28+ document tools...</span>
          <div className="not-found-screen__search-btn">
            <FileText size={13} />
          </div>
        </div>

        {/* Action Pills */}
        <div className="not-found-screen__actions">
          <button
            type="button"
            className="not-found-screen__btn-primary"
            onClick={() => navigate('/')}
          >
            <Home size={16} />
            <span>Return to Workspace</span>
          </button>

          <button
            type="button"
            className="not-found-screen__btn-secondary"
            onClick={() => navigate('/tools')}
          >
            <Compass size={16} />
            <span>Browse All Tools</span>
          </button>
        </div>

        <button
          type="button"
          className="not-found-screen__back-link"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={14} />
          <span>Go back to previous page</span>
        </button>
      </div>
    </div>
  );
}
