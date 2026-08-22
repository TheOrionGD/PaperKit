import './SplashScreen.css';

export default function SplashScreen({ fadeOut = false }) {
  return (
    <div className={`splash-screen${fadeOut ? ' splash-screen--fade-out' : ''}`}>
      <div className="splash-screen__content">
        <div className="splash-screen__logo-container">
          <div className="splash-screen__logo">
            <img src="/icon-192.png" alt="PaperKit Logo" width="64" height="64" style={{ borderRadius: '16px' }} />
          </div>
        </div>
        <h1 className="splash-screen__app-name">PaperKit</h1>
        <p className="splash-screen__tagline">All-in-One PDF &amp; Media Solution</p>
        <div className="splash-screen__loader">
          <div className="splash-screen__spinner"></div>
        </div>
      </div>
    </div>
  );
}
