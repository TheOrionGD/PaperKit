import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Cloud, RefreshCw, Info } from 'lucide-react';
import { getStorageUsage, getFileMetadata } from '../services/jobs';
import { listFiles, getFileDownloadUrl } from '../services/files';
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
      const url = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${downloadUrl}`;
      window.open(url, '_blank');
    } catch (err) {
      setError(err?.message || 'Preview failed');
    }
  };

  const handleDownload = async (file) => {
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      const url = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${downloadUrl}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

  const maxBytes = config.maxLocalSizeMB * 1024 * 1024;
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
            <span className="storage-screen__subtext">{localPercent.toFixed(1)}% of allocation threshold ({config.maxLocalSizeMB} MB)</span>
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
                  Max Local File Size: <strong>{config.maxLocalSizeMB} MB</strong>
                </label>
                <input
                  id="max-local-size-slider"
                  type="range"
                  min="1"
                  max="50"
                  value={config.maxLocalSizeMB}
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

          {/* Simulation Tools */}
          <div className="routing-config-card">
            <h3>Simulation Sandbox</h3>
            <div className="routing-form-group">
              <div className="routing-form-field">
                <label htmlFor="network-sim-select">Network Simulation State:</label>
                <select
                  id="network-sim-select"
                  value={config.networkSim}
                  onChange={e => updateConfig({ networkSim: e.target.value })}
                >
                  <option value="default">Default (System Connection)</option>
                  <option value="online">Simulate Online</option>
                  <option value="offline">Simulate Offline (Force Local Fallback)</option>
                </select>
              </div>
              <div className="routing-form-field">
                <label htmlFor="engine-sim-select">Client Local Engines:</label>
                <select
                  id="engine-sim-select"
                  value={config.engineSim}
                  onChange={e => updateConfig({ engineSim: e.target.value })}
                >
                  <option value="available">Engines Loaded (pdf-lib ready)</option>
                  <option value="unavailable">Engines Disabled (Simulate missing libs)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="storage-screen__content">
        <div className="storage-screen__files-section">
          <h2>File Storage List</h2>
          <div className="storage-screen__file-list">
            {files.length === 0 ? (
              <p className="storage-screen__empty">No files in storage.</p>
            ) : (
              files.map(file => {
                const _isCloud = !!file.thumbnail_url?.startsWith('http') || (file.content_type && file.thumbnail_url); // Or check if synced
                // Let's check status or format
                return (
                  <div key={file._id} className="storage-file-item">
                    <div className="storage-file-item__info">
                      <FileTypeIcon type={getFileType(file.original_filename)} size={32} />
                      <div className="storage-file-item__text">
                        <span className="storage-file-item__name">{file.original_filename}</span>
                        <span className="storage-file-item__size">{(file.size / 1024 / 1024).toFixed(3)} MB · {formatFileTimestamp(file.created_at || file.updated_at)}</span>
                      </div>
                    </div>
                    <div className="storage-file-item__actions">
                      <button className="storage-file-item__meta-btn" onClick={() => handleShowMeta(file._id)} title="View Metadata">
                        <Info size={16} /> Metadata
                      </button>
                      <button className="storage-file-item__sync-btn" onClick={() => handlePreview(file)} title="Preview File">
                        Preview
                      </button>
                      <button className="storage-file-item__sync-btn" onClick={() => handleDownload(file)} title="Download File" style={{ background: 'var(--color-primary)', color: 'white' }}>
                        Download
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
                  <a href={selectedFileMeta.storageUrl.startsWith('http') ? selectedFileMeta.storageUrl : `http://localhost:8000${selectedFileMeta.storageUrl}`} target="_blank" rel="noopener noreferrer">
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
