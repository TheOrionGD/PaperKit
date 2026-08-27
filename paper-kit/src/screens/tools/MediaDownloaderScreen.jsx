import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, Music, Download, Zap, HardDrive, ShieldCheck, DownloadCloud } from 'lucide-react';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import '../ai/ai-screen.css';

const TOOL_TIPS = [
  {
    icon: <DownloadCloud size={20} />,
    title: 'High Quality',
    description: 'Download the best available video/audio quality.'
  },
  {
    icon: <HardDrive size={20} />,
    title: 'Save Offline',
    description: 'Store files locally for offline enjoyment.'
  },
  {
    icon: <Music size={20} />,
    title: 'Audio Extraction',
    description: 'Rip high-bitrate MP3s from videos.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Fast Speeds',
    description: 'Multi-threaded downloads for maximum speed.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'No Tracking',
    description: '100% private and secure downloads.'
  },
];


export default function MediaDownloaderScreen() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'youtube'; // 'youtube' or 'spotify'
  
  const [url, setUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Fetching & Downloading…');
  const { toast, showToast, dismissToast } = useToast();

  const isYouTube = typeParam === 'youtube';

  // Extract YouTube ID from various URL patterns
  function extractYouTubeId(ytUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = ytUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  // Fetch title from oEmbed
  async function fetchMediaTitle(targetUrl) {
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          return data.title.replace(/[^\w\s.-]/gi, '').trim();
        }
      }
    } catch (e) {
      console.debug('Failed to fetch media title:', e);
    }
    return null;
  }

  // Multi-instance Cobalt Stream Resolver
  async function resolveWithCobalt(targetUrl, isAudioOnly = false) {
    const cobaltInstances = [
      'https://api.cobalt.tools',
      'https://cobalt-api.kwiatekm.com',
      'https://cobalt.xy2401.com',
      'https://api.wuk.sh'
    ];

    for (const instance of cobaltInstances) {
      try {
        const res = await fetch(instance, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: targetUrl,
            downloadMode: isAudioOnly ? 'audio' : 'auto',
            audioFormat: 'mp3',
            videoQuality: '1080'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && (data.url || data.audio || data.status === 'tunnel' || data.status === 'redirect')) {
            return data.url || data.audio;
          }
        }
      } catch (err) {
        console.debug(`Cobalt instance ${instance} unavailable:`, err.message);
      }
    }
    return null;
  }

  // Piped Stream Resolver for YouTube
  async function resolveWithPiped(videoId) {
    const pipedInstances = [
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://api.piped.privacydev.net/streams/${videoId}`,
      `https://pipedapi.tokhmi.xyz/streams/${videoId}`
    ];

    for (const instance of pipedInstances) {
      try {
        const res = await fetch(instance);
        if (res.ok) {
          const data = await res.json();
          if (data && data.videoStreams && data.videoStreams.length > 0) {
            // Find 1080p or 720p or highest available mp4
            const mp4s = data.videoStreams.filter(s => s.mimeType?.includes('mp4') || s.format === 'MPEG_4');
            const stream = mp4s[0] || data.videoStreams[0];
            return {
              streamUrl: stream.url,
              title: data.title || 'video'
            };
          }
        }
      } catch (err) {
        console.debug(`Piped instance ${instance} unavailable:`, err.message);
      }
    }
    return null;
  }

  async function handleDownload() {
    const trimmed = url.trim();
    if (!trimmed) {
      showToast('Please enter a valid URL', 'error');
      return;
    }
    
    setDownloading(true);
    setStatusMessage('Connecting to media engine…');

    try {
      let downloadBlob = null;
      let downloadFilename = isYouTube ? 'youtube_video.mp4' : 'spotify_track.mp3';
      let downloadUrl = null;

      // ── Stage 1: Try Primary Backend API ──
      try {
        const { API_BASE } = await import('../../services/api');
        const endpoint = isYouTube 
          ? `${API_BASE}/api/media/download-youtube` 
          : `${API_BASE}/api/media/download-spotify`;
          
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed })
        });
        
        if (response.ok) {
          const contentDisposition = response.headers.get('content-disposition');
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) downloadFilename = match[1];
          }
          downloadBlob = await response.blob();
        }
      } catch (backendErr) {
        console.debug('Backend download endpoint error, falling back to public stream resolver:', backendErr.message);
      }

      // ── Stage 2: Cobalt Stream Engine Fallback ──
      if (!downloadBlob) {
        setStatusMessage('Resolving high-speed media stream…');
        const resolvedDirectUrl = await resolveWithCobalt(trimmed, !isYouTube);
        
        if (resolvedDirectUrl) {
          downloadUrl = resolvedDirectUrl;
          const mediaTitle = await fetchMediaTitle(trimmed);
          if (mediaTitle) {
            downloadFilename = `${mediaTitle}.${isYouTube ? 'mp4' : 'mp3'}`;
          }
        }
      }

      // ── Stage 3: Piped Engine Fallback for YouTube ──
      if (!downloadBlob && !downloadUrl && isYouTube) {
        setStatusMessage('Extracting direct HD video stream…');
        const ytId = extractYouTubeId(trimmed);
        if (ytId) {
          const pipedData = await resolveWithPiped(ytId);
          if (pipedData && pipedData.streamUrl) {
            downloadUrl = pipedData.streamUrl;
            downloadFilename = `${pipedData.title.replace(/[^\w\s.-]/gi, '').trim() || 'youtube_video'}.mp4`;
          }
        }
      }

      // ── Stage 4: Trigger File Delivery ──
      if (downloadBlob) {
        const objectUrl = URL.createObjectURL(downloadBlob);
        downloadAndOpenFile(objectUrl, downloadFilename, downloadBlob.type);
        showToast('Download started successfully!', 'success');
        setUrl('');
      } else if (downloadUrl) {
        // Attempt fetch blob or trigger browser download link
        try {
          const streamFetch = await fetch(downloadUrl);
          if (streamFetch.ok) {
            const blob = await streamFetch.blob();
            const objectUrl = URL.createObjectURL(blob);
            downloadAndOpenFile(objectUrl, downloadFilename, blob.type);
            showToast('Download started successfully!', 'success');
            setUrl('');
            return;
          }
        } catch (corsErr) {
          console.debug('Direct stream download via Anchor:', corsErr);
        }

        // Anchor download fallback
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = downloadFilename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast('Media stream opened for download!', 'success');
        setUrl('');
      } else {
        // Direct web portal fallback
        const fallbackPortal = `https://cobalt.tools/?u=${encodeURIComponent(trimmed)}`;
        window.open(fallbackPortal, '_blank');
        showToast('Opening high-speed media stream portal…', 'info');
      }
      
    } catch (err) {
      console.error('Media download error:', err);
      showToast(err.message || 'Failed to download media. Opening portal…', 'error');
      window.open(`https://cobalt.tools/?u=${encodeURIComponent(trimmed)}`, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="ai-screen">

      <div className="ai-screen__unavailable" style={{ opacity: 1, padding: '24px 0', border: 'none', background: 'transparent' }}>
        <div className="ai-screen__unavailable-icon" style={{ background: isYouTube ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}>
          {isYouTube ? (
            <Video size={28} color="#EF4444" />
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
          <p className="ai-screen__loading-text">{statusMessage}</p>
          <p className="ai-screen__loading-sub">Connecting to fast media streaming network</p>
        </div>
      )}


      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
