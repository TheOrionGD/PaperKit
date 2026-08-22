import { useState, useEffect } from 'react';
import './components.css';

export default function LoadingState({ text = 'Loading...' }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-state">
      <div className="loading-state__capsule" style={{ flexDirection: 'column', gap: '8px', padding: '16px 24px', maxWidth: '380px', textAlign: 'center' }}>
        <div className="loading-spinner" />
        <p className="loading-state__text" style={{ margin: 0, fontWeight: 600 }}>{text}</p>
        
        {seconds >= 5 && (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            ☁ Waking up cloud service ({seconds}s)...
            <br />
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Free tier servers take ~30–60s on the initial request.</span>
          </p>
        )}
      </div>
    </div>
  );
}

