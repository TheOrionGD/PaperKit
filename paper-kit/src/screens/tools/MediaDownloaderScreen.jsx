import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Youtube, Music, Download } from 'lucide-react';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import '../ai/ai-screen.css';

export default function MediaDownloaderScreen() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'youtube'; // 'youtube' or 'spotify'
  
  const [url, setUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  async function handleDownload() {
    if (!url) {
      showToast('Please enter a valid URL', 'error');
      return;
    }
    
    setDownloading(true);
    try {
      const endpoint = typeParam === 'youtube' 
        ? '/api/media/download-youtube' 
        : '/api/media/download-spotify';
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Download failed');
      }
      
      // Get the filename from the Content-Disposition header if possible
      const contentDisposition = response.headers.get('content-disposition');
      let filename = typeParam === 'youtube' ? 'video.mp4' : 'audio.mp3';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Trigger download
      downloadAndOpenFile(objectUrl, filename, blob.type);
      showToast('Download started successfully!', 'success');
      setUrl('');
      
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to download media', 'error');
    } finally {
      setDownloading(false);
    }
  }

  const isYouTube = typeParam === 'youtube';

  return (
    <div className="ai-screen">
      <div className="ai-screen__unavailable" style={{ opacity: 1, padding: '24px 0', border: 'none', background: 'transparent' }}>
        <div className="ai-screen__unavailable-icon" style={{ background: isYouTube ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}>
          {isYouTube ? (
            <Youtube size={28} color="#EF4444" />
          ) : (
            <Music size={28} color="#22C55E" />
          )}
        </div>
        <p className="ai-screen__unavailable-title">
          {isYouTube ? 'YouTube Video Downloader' : 'Spotify Audio Downloader'}
        </p>
        <p className="ai-screen__unavailable-sub">
          {isYouTube 
            ? 'Paste a YouTube link below to download the highest quality MP4 video.' 
            : 'Paste a Spotify track link below to download it as an MP3 audio file.'}
        </p>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          {isYouTube ? 'YouTube URL' : 'Spotify Track URL'}
        </label>
        <input 
          type="url" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={isYouTube ? "https://www.youtube.com/watch?v=..." : "https://open.spotify.com/track/..."}
          style={{ 
            width: '100%', padding: '10px 12px', borderRadius: '10px', 
            border: '1px solid var(--color-divider)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            fontSize: '13px', outline: 'none'
          }}
          disabled={downloading}
        />
      </div>

      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleDownload}
          disabled={!url || downloading}
          style={{ background: isYouTube ? '#EF4444' : '#22C55E', color: '#fff', border: 'none' }}
        >
          {downloading ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Processing & Downloading…
            </>
          ) : (
            <>
              <Download size={17} />
              Download Now
            </>
          )}
        </button>
      </div>

      {downloading && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb" style={{ background: isYouTube ? '#EF4444' : '#22C55E' }}>
            <Download size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Fetching & Downloading…</p>
          <p className="ai-screen__loading-sub">This may take a minute for longer content</p>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
