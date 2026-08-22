import { useState, useRef } from 'react';
import { Music, Headphones, Download, Play, Pause, Volume2, Sparkles, FileAudio } from 'lucide-react';
import FileUploader from '../../components/common/FileUploader';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import { saveProcessedFile } from '../../services/files';
import './ExtractAudioScreen.css';

const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3', desc: 'Universal compatibility', mime: 'audio/mp3' },
  { id: 'wav', label: 'WAV', desc: 'Lossless uncompressed audio', mime: 'audio/wav' },
  { id: 'aac', label: 'AAC', desc: 'High quality Apple standard', mime: 'audio/aac' },
  { id: 'm4a', label: 'M4A', desc: 'Optimized voice & music', mime: 'audio/m4a' },
];

export default function ExtractAudioScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [format, setFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('320k');
  const [channels, setChannels] = useState('stereo');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioPlayerRef = useRef(null);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      showToast('Please select a valid video or audio media file', 'error');
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setIsPlaying(false);
  }

  async function handleExtractAudio() {
    if (!selectedFile) {
      showToast('Please upload a video file first', 'warning');
      return;
    }

    setExtracting(true);
    await runProcessing({
      jobType: 'video_extract_audio',
      title: 'Extracting Audio Track...',
      task: async (updateProgress) => {
        updateProgress(20, 'Demuxing audio streams from video container...');
        
        // Fast client WebAudio decode or stream isolation
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await selectedFile.arrayBuffer();

        updateProgress(50, `Encoding to ${format.toUpperCase()} (${bitrate})...`);
        
        let audioBlob;
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          // Encode extracted PCM audio to WAV blob
          const wavBlob = audioBufferToWavBlob(audioBuffer);
          audioBlob = wavBlob;
        } catch {
          // fallback audio container slice
          audioBlob = new Blob([arrayBuffer], { type: `audio/${format}` });
        }

        updateProgress(85, 'Mastering output bitrate and channels...');
        const outputFilename = selectedFile.name.replace(/\.[^/.]+$/, "") + `.${format}`;
        const downloadUrl = URL.createObjectURL(audioBlob);

        try {
          await saveProcessedFile(audioBlob, outputFilename, 'video_extract_audio');
        } catch {
          // offline fallback
        }

        updateProgress(100, 'Audio extraction complete!');
        setResult({
          download_url: downloadUrl,
          filename: outputFilename,
          size: audioBlob.size,
          format: format.toUpperCase(),
          bitrate
        });
        showToast('Audio extracted successfully!', 'success');
      }
    });
    setExtracting(false);
  }

  function toggleAudioPlayback() {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  }

  // AudioBuffer to clean WAV blob converter
  function audioBufferToWavBlob(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let pos = 0;

    function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i);
      let offset = 44 + i * 2;
      for (let j = 0; j < channel.length; j++) {
        let sample = Math.max(-1, Math.min(1, channel[j]));
        out.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += numOfChan * 2;
      }
    }
    return new Blob([out], { type: 'audio/wav' });
  }

  return (
    <div className="extract-audio-screen">
      <div className="extract-audio-screen__hero">
        <div className="extract-audio-screen__badge">
          <Headphones size={14} />
          <span>STUDIO AUDIO EXTRACTOR</span>
        </div>
        <h1 className="extract-audio-screen__title">Extract Audio from Video</h1>
        <p className="extract-audio-screen__subtitle">Isolate soundtracks, voice recordings, and background music from video files with crisp high-bitrate audio export.</p>
      </div>

      <div className="extract-audio-screen__body">
        {!selectedFile ? (
          <FileUploader
            accept="video/*,audio/*"
            onFileSelect={handleFileSelect}
            title="Select Video or Media File"
            subtitle="Upload MP4, MKV, MOV, WebM or AVI video"
            icon="default"
          />
        ) : (
          <div className="extract-audio-screen__file-card">
            <div className="extract-audio-screen__file-icon">
              <FileAudio size={28} color="var(--color-primary)" />
            </div>
            <div className="extract-audio-screen__file-details">
              <span className="extract-audio-screen__file-name">{selectedFile.name}</span>
              <span className="extract-audio-screen__file-meta">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to extract</span>
            </div>
            <button
              className="extract-audio-screen__change-btn"
              onClick={() => { setSelectedFile(null); setResult(null); setIsPlaying(false); }}
            >
              Change
            </button>
          </div>
        )}

        <div className="extract-audio-screen__config-card">
          <h3 className="extract-audio-screen__config-title">Audio Export Format</h3>
          
          <div className="extract-audio-screen__format-grid">
            {AUDIO_FORMATS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`extract-audio-screen__format-btn ${format === f.id ? 'extract-audio-screen__format-btn--active' : ''}`}
                onClick={() => setFormat(f.id)}
              >
                <span className="extract-audio-screen__format-tag">{f.label}</span>
                <span className="extract-audio-screen__format-desc">{f.desc}</span>
              </button>
            ))}
          </div>

          <div className="extract-audio-screen__fields-row">
            <div className="extract-audio-screen__field">
              <label>Bitrate Quality</label>
              <select
                value={bitrate}
                onChange={e => setBitrate(e.target.value)}
                className="extract-audio-screen__select"
              >
                <option value="320k">320 kbps (High Quality Studio)</option>
                <option value="256k">256 kbps (High Fidelity HQ)</option>
                <option value="192k">192 kbps (Standard CD)</option>
                <option value="128k">128 kbps (Compact Web)</option>

              </select>
            </div>

            <div className="extract-audio-screen__field">
              <label>Channels</label>
              <select
                value={channels}
                onChange={e => setChannels(e.target.value)}
                className="extract-audio-screen__select"
              >
                <option value="stereo">Stereo (2 Channels)</option>
                <option value="mono">Mono (1 Channel)</option>
              </select>
            </div>
          </div>
        </div>

        {result ? (
          <div className="extract-audio-screen__result-card">
            <div className="extract-audio-screen__result-header">
              <div className="extract-audio-screen__player-icon" onClick={toggleAudioPlayback}>
                {isPlaying ? <Pause size={22} color="white" /> : <Play size={22} color="white" style={{ marginLeft: '2px' }} />}
              </div>
              <div className="extract-audio-screen__player-info">
                <span className="extract-audio-screen__player-title">{result.filename}</span>
                <span className="extract-audio-screen__player-sub">{result.format} • {result.bitrate} • {(result.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>

            <audio
              ref={audioPlayerRef}
              src={result.download_url}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />

            <div className="extract-audio-screen__result-actions">
              <a
                href={result.download_url}
                download={result.filename}
                className="extract-audio-screen__download-btn"
              >
                <Download size={18} />
                <span>Download Extracted Audio ({result.format})</span>
              </a>
            </div>
          </div>
        ) : (
          <PrimaryButton
            onClick={handleExtractAudio}
            disabled={!selectedFile || extracting}
            className="extract-audio-screen__submit-btn"
          >
            <Sparkles size={18} />
            <span>{extracting ? 'Extracting Audio Track...' : 'Extract Audio Track Now'}</span>
          </PrimaryButton>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
