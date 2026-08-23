import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Cloud, RefreshCw, Info } from 'lucide-react';
import { getStorageUsage, getFileMetadata } from '../services/jobs';
import { listFiles, getFileDownloadUrl } from '../services/files';
import { downloadAndOpenFile } from '../services/native';
import LoadingState from '../components/ui/LoadingState';
import { useProcessing } from '../context/ProcessingContext';
import { FileTypeIcon } from '../components/icons/ToolIcons';
import { formatFileTimestamp, formatDateTime } from '../utils/dateUtils';
import './StorageScreen.css';

function getFileType(filename) {
  if (!filename) return 'default';
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = { pdf: 'pdf', doc: 'word', docx: 'word', xls: 'excel', xlsx: 'excel', ppt: 'ppt', pptx: 'ppt', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image' };
  return map[ext] || 'default';
}

export default function StorageScreen() {
  const { config, updateConfig } = useProcessing();
  const [usage, setUsage] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState('');
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usageData, filesData] = await Promise.all([
        getStorageUsage(),
        listFiles({ limit: 100 }), // get recent files to show their sync status
      ]);
      setUsage(usageData);
      setFiles(filesData.items || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load storage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePreview = async (file) => {
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      const url = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${downloadUrl}`;
      window.open(url, '_blank');
    } catch (err) {
      setError(err?.message || 'Preview failed');
    }
  };

  const handleDownload = async (file) => {
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      await downloadAndOpenFile(downloadUrl, file.original_filename, file.content_type);
    } catch (err) {
      setError(err?.message || 'Download failed');
    }
  };

  const handleShowMeta = async (fileId) => {
    try {
      const meta = await getFileMetadata(fileId);
      setSelectedFileMeta(meta);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load metadata');
    }
  };

  if (loading && !usage) {
    return <LoadingState text="Analyzing storage usage..." />;
  }

  const targetMB = (config.maxLocalSizeMB && config.maxLocalSizeMB !== 10) ? config.maxLocalSizeMB : 100;
  const maxBytes = targetMB * 1024 * 1024;
  const localPercent = usage ? Math.min((usage.localBytes / maxBytes) * 100, 100) : 0;
  const cloudPercent = 0; // Fixed since cloud sync is removed in UI

  return (
    <div className="storage-screen">
      <div className="storage-screen__header-row">
        <h1 className="storage-screen__title">Storage Dashboard</h1>
        <button className="storage-screen__refresh-btn" onClick={loadData} id="storage-refresh">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="storage-screen__error">{error}</div>}

      {usage && (
        <div className="storage-screen__overview">
          <div className="storage-screen__card storage-screen__card--total">
            <div className="storage-screen__card-header">
              <HardDrive size={24} className="storage-screen__icon--total" />
              <h3>Total Storage Used</h3>
            </div>
            <p className="storage-screen__value">{usage.totalMB} MB</p>
            <span className="storage-screen__subtext">{usage.fileCount} Files</span>
          </div>

          <div className="storage-screen__card storage-screen__card--local">
            <div className="storage-screen__card-header">
              <HardDrive size={24} className="storage-screen__icon--local" />
              <h3>Local Storage</h3>
            </div>
            <p className="storage-screen__value">{usage.localMB} MB</p>
            <div className="storage-screen__progress-bar">
              <div className="storage-screen__progress-fill storage-screen__progress-fill--local" style={{ width: `${localPercent}%` }} />
            </div>
            <span className="storage-screen__subtext">{localPercent.toFixed(1)}% of allocation threshold ({targetMB} MB)</span>
          </div>

          <div className="storage-screen__card storage-screen__card--cloud">
            <div className="storage-screen__card-header">
              <Cloud size={24} className="storage-screen__icon--cloud" />
              <h3>Cloud Storage (Cloudinary)</h3>
            </div>
            <p className="storage-screen__value">{usage.cloudMB} MB</p>
            <div className="storage-screen__progress-bar">
              <div className="storage-screen__progress-fill storage-screen__progress-fill--cloud" style={{ width: `${cloudPercent}%` }} />
            </div>
            <span className="storage-screen__subtext">{cloudPercent.toFixed(1)}% of total</span>
          </div>
        </div>
      )}

      {/* Hybrid Routing Configuration Panel */}
      <div className="storage-screen__routing-config">
        <h2 className="storage-screen__section-title">Hybrid Routing Control Center</h2>
        <p className="storage-screen__section-subtitle">Manage edge vs. cloud routing policies and simulate device conditions.</p>
        
        <div className="routing-config-grid">
          {/* Main Routing Mode */}
          <div className="routing-config-card">
            <h3>Routing Preference Policy</h3>
            <div className="routing-option-group">
              {[
                { id: 'auto', label: 'Dynamic (Auto)', desc: 'Optimal choice based on constraints' },
                { id: 'local', label: 'Force Local', desc: 'Edge processing via pdf-lib' },
                { id: 'backend', label: 'Force Backend', desc: 'Render API hosting node' },
                { id: 'cloud', label: 'Force Cloud', desc: 'Cloudinary / AI servers' },
              ].map(opt => (
                <button
                  key={opt.id}
                  className={`routing-mode-btn ${config.mode === opt.id ? 'routing-mode-btn--active' : ''}`}
                  onClick={() => updateConfig({ mode: opt.id })}
                  id={`routing-policy-${opt.id}`}
                >
                  <span className="routing-mode-btn__label">{opt.label}</span>
                  <span className="routing-mode-btn__desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Thresholds and Capabilities */}
          <div className="routing-config-card">
            <h3>Thresholds & Device Power</h3>
            <div className="routing-form-group">
              <div className="routing-form-field">
                <label htmlFor="max-local-size-slider">
                  Max Local File Size: <strong>{config.maxLocalSizeMB || 100} MB</strong>
                </label>
                <input
                  id="max-local-size-slider"
                  type="range"
                  min="1"
                  max="200"
                  value={config.maxLocalSizeMB || 100}
                  onChange={e => updateConfig({ maxLocalSizeMB: Number(e.target.value) })}
                />
              </div>
              <div className="routing-form-field">
                <label htmlFor="device-power-select">Device Core Performance:</label>
                <select
                  id="device-power-select"
                  value={config.deviceCapability}
                  onChange={e => updateConfig({ deviceCapability: e.target.value })}
                >
                  <option value="high">High Performance (Default)</option>
                  <option value="low">Low Performance (Restricts Local Size)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="storage-screen__content">
        {selectedFileMeta && (
          <div className="storage-screen__meta-section">
            <div className="storage-screen__meta-header">
              <h2>Extended Metadata</h2>
              <button className="storage-screen__meta-close" onClick={() => setSelectedFileMeta(null)}>✕</button>
            </div>
            <div className="storage-meta-details">
              <div className="storage-meta-row">
                <span className="storage-meta-label">File ID</span>
                <span className="storage-meta-val monospace">{selectedFileMeta.id}</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">Filename</span>
                <span className="storage-meta-val">{selectedFileMeta.filename}</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">Content Type</span>
                <span className="storage-meta-val">{selectedFileMeta.contentType}</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">Size</span>
                <span className="storage-meta-val">{selectedFileMeta.size} bytes ({selectedFileMeta.sizeMB} MB)</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">Storage Type</span>
                <span className={`storage-meta-val storage-meta-val--badge storage-meta-val--${selectedFileMeta.storageType}`}>
                  {selectedFileMeta.storageType === 'cloud' ? 'Cloud (Cloudinary)' : 'Local Disk'}
                </span>
              </div>
              {selectedFileMeta.cloudinaryPublicId && (
                <div className="storage-meta-row">
                  <span className="storage-meta-label">Cloud Public ID</span>
                  <span className="storage-meta-val monospace">{selectedFileMeta.cloudinaryPublicId}</span>
                </div>
              )}
              <div className="storage-meta-row">
                <span className="storage-meta-label">Created At</span>
                <span className="storage-meta-val">{formatDateTime(selectedFileMeta.createdAt)}</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">Updated At</span>
                <span className="storage-meta-val">{formatDateTime(selectedFileMeta.updatedAt)}</span>
              </div>
              <div className="storage-meta-row">
                <span className="storage-meta-label">URL</span>
                <span className="storage-meta-val">
                  <a href={selectedFileMeta.storageUrl.startsWith('http') ? selectedFileMeta.storageUrl : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${selectedFileMeta.storageUrl}`} target="_blank" rel="noopener noreferrer">
                    Open File
                  </a>
                </span>
              </div>
              {/* Cloud sync removed */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
