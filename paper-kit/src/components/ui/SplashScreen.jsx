/* SplashScreen.jsx — Splash Screen with Render Cloud Backend Health Indicator */
import { RefreshCw, ArrowRight, Cloud, Sparkles } from 'lucide-react';
import './SplashScreen.css';

export default function SplashScreen({
  fadeOut = false,
  statusMessage = 'Connecting to PaperKit Cloud...',
  stage: _stage = 'connecting',
  isWakingUp: _isWakingUp = false,
  elapsedSeconds: _elapsedSeconds = 0,
  services = { backend: false, web: false },
  error = null,
  onRetry = null,
  onProceedAnyway = null,
}) {
  return (
    <div className={`splash-screen${fadeOut ? ' splash-screen--fade-out' : ''}`}>
      {/* Ambient background glow */}
      <div className="splash-screen__ambient-glow"></div>

      <div className="splash-screen__content">
        <div className="splash-screen__logo-container">
          <div className="splash-screen__logo-glow"></div>
          <div className="splash-screen__logo">
            <img
              src="/icon-192.png"
              alt="PaperKit Logo"
              width="72"
              height="72"
              style={{ borderRadius: '20px', boxShadow: '0 12px 30px rgba(37, 99, 235, 0.3)' }}
            />
          </div>
        </div>

        <h1 className="splash-screen__app-name">PaperKit</h1>
        <p className="splash-screen__tagline">All-in-One PDF &amp; Document Intelligence</p>

        {/* Dynamic Status & Loader Section */}
        {!error ? (
          <div className="splash-screen__status-box">
            <div className="splash-screen__loader">
              <div className="splash-screen__spinner"></div>
            </div>

            <div className="splash-screen__status-details">
              <p className="splash-screen__status-msg">
                {statusMessage}
              </p>

              {/* Dual Render service indicators */}
              <div className="splash-screen__services-row">
                <span className={`splash-screen__service-chip ${services?.backend ? 'splash-screen__service-chip--online' : 'splash-screen__service-chip--syncing'}`}>
                  <span className="splash-screen__service-dot" />
                  <span>Cloud Backend</span>
                </span>
                <span className={`splash-screen__service-chip ${services?.web ? 'splash-screen__service-chip--online' : 'splash-screen__service-chip--syncing'}`}>
                  <span className="splash-screen__service-dot" />
                  <span>Local Engine</span>
                </span>
              </div>
            </div>

            {/* Instant access button always available for frictionless entry */}
            {onProceedAnyway && (
              <button
                type="button"
                className="splash-screen__skip-btn"
                onClick={onProceedAnyway}
                title="Enter PaperKit workspace immediately"
                id="splash-enter-workspace-btn"
              >
                <span>Enter Workspace Direct</span>
                <ArrowRight size={14} className="splash-screen__skip-arrow" />
              </button>
            )}
          </div>
        ) : (
          /* Error / Server Timeout State */
          <div className="splash-screen__error-card">
            <div className="splash-screen__error-icon">
              <Cloud size={24} color="#EF4444" />
            </div>
            <h3 className="splash-screen__error-title">Server Connection Delay</h3>
            <p className="splash-screen__error-desc">
              {error || 'The backend service on Render is taking longer than usual to spin up from standby mode.'}
            </p>

            <div className="splash-screen__error-actions">
              {onRetry && (
                <button
                  type="button"
                  className="splash-screen__action-btn splash-screen__action-btn--primary"
                  onClick={onRetry}
                >
                  <RefreshCw size={14} />
                  <span>Retry Connection</span>
                </button>
              )}

              {onProceedAnyway && (
                <button
                  type="button"
                  className="splash-screen__action-btn splash-screen__action-btn--secondary"
                  onClick={onProceedAnyway}
                >
                  <span>Proceed Offline / Preview</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="splash-screen__footer-brand">
          <Sparkles size={13} color="var(--color-primary, #2563EB)" />
          <span>PaperKit Studio Cloud</span>
        </div>
      </div>
    </div>
  );
}
