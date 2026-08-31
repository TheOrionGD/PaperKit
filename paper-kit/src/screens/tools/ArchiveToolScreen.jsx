import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Archive,
  FolderArchive,
  FileArchive,
  Download,
  FileText,
  Loader2,
  Folder,
  Layers,
  Zap,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  FileUp,
  FileCheck
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import FileUploader from '../../components/common/FileUploader';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import {
  inspectArchive,
  createZip,
  createTar,
  createTarGz,
  formatBytes,
  detectArchiveFormat
} from '../../utils/archiveUtils';
import './ArchiveToolScreen.css';

const TOOL_TIPS = [
  {
    icon: <Archive size={20} />,
    title: 'Multi-Format Archive Suite',
    description: 'Full support for .ZIP, .RAR, .TAR, .GZ, .7Z, and .BZ2 archives.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Instant Extraction',
    description: 'Inspect and extract individual files directly in your browser.'
  },
  {
    icon: <Layers size={20} />,
    title: 'Multi-Level Compression',
    description: 'Pack folders and files into ultra-compact ZIP or TAR.GZ archives.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Client-Side Privacy',
    description: 'Archives are processed securely inside your device memory.'
  }
];

const COMPRESSION_LEVELS = [
  { id: 0, label: 'Store (0%)', desc: 'No compression, fastest packaging' },
  { id: 1, label: 'Fast (Level 1)', desc: 'Quick compression with low CPU usage' },
  { id: 6, label: 'Balanced (Level 6)', desc: 'Standard recommended balance' },
  { id: 9, label: 'Ultra (Level 9)', desc: 'Maximum file size reduction' },
];

export default function ArchiveToolScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialMode = searchParams.get('mode') || 'extract'; // 'extract' | 'create' | 'convert'

  const [activeTab, setActiveTab] = useState(initialMode === 'create' ? 'create' : 'extract');
  
  // Extract State
  const [archiveFile, setArchiveFile] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [archiveData, setArchiveData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [extractProgress, setExtractProgress] = useState(null);

  // Create State
  const [createFiles, setCreateFiles] = useState([]);
  const [archiveName, setArchiveName] = useState('archive');
  const [archiveFormat, setArchiveFormat] = useState('zip'); // 'zip' | 'tar' | 'tar.gz'
  const [compressionLevel, setCompressionLevel] = useState(6);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  // Result state
  const [result, setResult] = useState(null);

  const multiFileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      const fmt = detectArchiveFormat(fileObj.name);
      if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'tar.gz'].includes(fmt)) {
        setActiveTab('extract');
        handleInspectArchive(fileObj);
      } else {
        setActiveTab('create');
        setCreateFiles([fileObj]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Handle Inspect Archive
  async function handleInspectArchive(file) {
    if (!file) return;
    setArchiveFile(file);
    setInspecting(true);
    setArchiveData(null);
    setResult(null);

    try {
      const data = await inspectArchive(file);
      setArchiveData(data);
      showToast(`Loaded ${data.files.length} items from ${file.name}`, 'success');
    } catch (err) {
      showToast('Failed to inspect archive: ' + err.message, 'error');
    } finally {
      setInspecting(false);
    }
  }

  // Handle Download Single File
  async function handleDownloadEntry(entry) {
    try {
      const blob = await entry.getBlob();
      const url = URL.createObjectURL(blob);
      const fileName = entry.name.split('/').pop() || entry.name;
      
      if (window.Capacitor?.isNativePlatform?.()) {
        await downloadAndOpenFile(url, fileName, 'application/octet-stream');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      }
      showToast(`Downloaded ${fileName}`, 'success');
    } catch (err) {
      showToast('Failed to download item: ' + err.message, 'error');
    }
  }

  // Handle Extract All
  async function handleExtractAll() {
    if (!archiveData || !archiveData.files.length) return;
    setExtractProgress('Extracting all files...');
    try {
      // Re-pack as clean standard zip if not already zip, or trigger batch download
      const validFiles = archiveData.files.filter(f => !f.isDir);
      const extractedBlobs = await Promise.all(
        validFiles.map(async f => ({
          name: f.name,
          content: await f.getBlob(),
        }))
      );

      const cleanZip = await createZip(extractedBlobs, { compressionLevel: 6 });
      const url = URL.createObjectURL(cleanZip);
      const outputName = `${archiveFile.name.replace(/\.[^/.]+$/, "")}_extracted.zip`;

      setResult({
        downloadUrl: url,
        fileName: outputName,
        size: cleanZip.size,
        message: `Extracted ${validFiles.length} files successfully!`,
      });
      showToast('All files extracted & ready for download!', 'success');
    } catch (err) {
      showToast('Extraction failed: ' + err.message, 'error');
    } finally {
      setExtractProgress(null);
    }
  }

  // Handle Create Archive
  async function handleCreateArchive() {
    if (!createFiles.length) {
      showToast('Please add at least one file to create an archive', 'error');
      return;
    }

    setCreating(true);
    setCreateProgress(10);

    try {
      let blob;
      const cleanName = (archiveName.trim() || 'archive').replace(/\.[^/.]+$/, "");
      let outputFileName = `${cleanName}.${archiveFormat}`;

      if (archiveFormat === 'zip') {
        blob = await createZip(createFiles, {
          compressionLevel,
          onProgress: (p) => setCreateProgress(Math.max(10, p)),
        });
      } else if (archiveFormat === 'tar') {
        blob = await createTar(createFiles);
        setCreateProgress(100);
      } else if (archiveFormat === 'tar.gz') {
        blob = await createTarGz(createFiles);
        setCreateProgress(100);
        outputFileName = `${cleanName}.tar.gz`;
      }

      const url = URL.createObjectURL(blob);
      setResult({
        downloadUrl: url,
        fileName: outputFileName,
        size: blob.size,
        message: `Created ${outputFileName} with ${createFiles.length} files (${formatBytes(blob.size)})`,
      });
      showToast('Archive created successfully!', 'success');
    } catch (err) {
      showToast('Failed to create archive: ' + err.message, 'error');
    } finally {
      setCreating(false);
      setCreateProgress(0);
    }
  }

  function handleAddCreateFiles(e) {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files);
      setCreateFiles(prev => [...prev, ...added]);
    }
  }

  function removeCreateFile(index) {
    setCreateFiles(prev => prev.filter((_, i) => i !== index));
  }

  const filteredArchiveEntries = archiveData?.files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="archive-tool-screen">
      {/* Header */}
      <div className="archive-tool-header">
        <div className="archive-tool-header__badge">
          <FolderArchive size={16} /> Archive Suite
        </div>
        <h1 className="archive-tool-header__title">Archive &amp; Compression Studio</h1>
        <p className="archive-tool-header__subtitle">
          Extract, inspect, create, and convert ZIP, RAR, TAR, GZ, 7Z, and BZ2 archives with zero cloud uploads.
        </p>

        {/* Tab Switcher */}
        {!result && (
          <div className="archive-tool-tabs">
            <button
              className={`archive-tool-tab ${activeTab === 'extract' ? 'archive-tool-tab--active' : ''}`}
              onClick={() => { setActiveTab('extract'); setResult(null); }}
            >
              <FileArchive size={16} /> Extract &amp; View Archive
            </button>
            <button
              className={`archive-tool-tab ${activeTab === 'create' ? 'archive-tool-tab--active' : ''}`}
              onClick={() => { setActiveTab('create'); setResult(null); }}
            >
              <Archive size={16} /> Create Archive (.ZIP / .TAR)
            </button>
          </div>
        )}
      </div>

      {/* Result View */}
      {result ? (
        <CommonResultScreen
          preset={ACTION_PRESETS.CONVERT}
          resultData={result}
          onReset={() => {
            setResult(null);
            setArchiveData(null);
            setArchiveFile(null);
            setCreateFiles([]);
          }}
        />
      ) : (
        <div className="archive-tool-content">
          {/* TAB 1: EXTRACT & VIEW ARCHIVE */}
          {activeTab === 'extract' && (
            <div>
              {!archiveData && !inspecting && (
                <FileUploader
                  accept=".zip,.rar,.tar,.gz,.7z,.bz2,.tgz,.tar.gz,.tbz2,application/zip,application/x-zip-compressed,application/x-tar,application/gzip,application/x-7z-compressed,application/x-rar-compressed"
                  onFileSelect={handleInspectArchive}
                  title="Select Archive to Extract or Inspect"
                  subtitle="Supports .ZIP, .RAR, .TAR, .GZ, .7Z, and .BZ2 files"
                  icon="zip"
                />
              )}

              {inspecting && (
                <div className="archive-loading-card">
                  <Loader2 className="animate-spin" size={44} color="var(--color-primary)" />
                  <h3>Reading Archive Structure...</h3>
                  <p>Analyzing compressed headers and index...</p>
                </div>
              )}

              {archiveData && (
                <div className="archive-inspector-card">
                  {/* Archive Meta Bar */}
                  <div className="archive-meta-bar">
                    <div className="archive-meta-bar__left">
                      <div className="archive-meta-bar__icon">
                        <FolderArchive size={28} color="var(--color-primary)" />
                      </div>
                      <div>
                        <h3 className="archive-meta-bar__name">{archiveData.filename}</h3>
                        <div className="archive-meta-bar__details">
                          <span>{formatBytes(archiveData.totalSize)}</span>
                          <span>•</span>
                          <span>{archiveData.files.length} items</span>
                          <span>•</span>
                          <span className="archive-format-tag">{archiveData.format.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="archive-meta-bar__actions">
                      <button
                        className="btn-secondary archive-change-btn"
                        onClick={() => {
                          setArchiveData(null);
                          setArchiveFile(null);
                        }}
                      >
                        Change File
                      </button>
                      <button
                        className="btn-primary archive-extract-all-btn"
                        onClick={handleExtractAll}
                        disabled={!!extractProgress}
                      >
                        {extractProgress ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                        <span>Extract All to ZIP</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="archive-search-box">
                    <Search size={16} color="var(--color-text-muted)" />
                    <input
                      type="text"
                      placeholder="Search files inside archive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Entries List */}
                  <div className="archive-entries-list">
                    {filteredArchiveEntries.length === 0 ? (
                      <div className="archive-empty-search">
                        <p>No files match &quot;{searchQuery}&quot;</p>
                      </div>
                    ) : (
                      filteredArchiveEntries.map((entry, idx) => (
                        <div key={idx} className="archive-entry-row">
                          <div className="archive-entry-row__icon">
                            {entry.isDir ? (
                              <Folder size={20} color="#F59E0B" />
                            ) : (
                              <FileText size={20} color="var(--color-primary)" />
                            )}
                          </div>
                          <div className="archive-entry-row__info">
                            <span className="archive-entry-row__name" title={entry.name}>
                              {entry.name}
                            </span>
                            <span className="archive-entry-row__meta">
                              {entry.isDir ? 'Folder' : formatBytes(entry.size)}
                              {entry.date && ` • ${new Date(entry.date).toLocaleDateString()}`}
                            </span>
                          </div>
                          {!entry.isDir && (
                            <button
                              className="archive-entry-row__download-btn"
                              onClick={() => handleDownloadEntry(entry)}
                              title="Download this file"
                            >
                              <Download size={15} />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE ARCHIVE */}
          {activeTab === 'create' && (
            <div className="archive-create-panel">
              {/* Added Files Box */}
              <div className="archive-create-files-box">
                <div className="archive-create-files-header">
                  <h3>Files to Include ({createFiles.length})</h3>
                  <button
                    className="archive-add-more-btn"
                    onClick={() => multiFileInputRef.current?.click()}
                  >
                    <Plus size={15} /> Add Files
                  </button>
                  <input
                    ref={multiFileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleAddCreateFiles}
                  />
                </div>

                {createFiles.length === 0 ? (
                  <div
                    className="archive-create-dropzone"
                    onClick={() => multiFileInputRef.current?.click()}
                  >
                    <FileUp size={36} color="var(--color-primary)" />
                    <h4>Select Files to Archive</h4>
                    <p>Choose any documents, images, videos, audio, or PDFs</p>
                    <button type="button" className="btn-primary" style={{ marginTop: 12 }}>
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="archive-selected-files-list">
                    {createFiles.map((file, idx) => (
                      <div key={idx} className="archive-selected-file-item">
                        <FileCheck size={18} color="#10B981" />
                        <div className="archive-selected-file-info">
                          <span className="archive-selected-file-name">{file.name}</span>
                          <span className="archive-selected-file-size">{formatBytes(file.size)}</span>
                        </div>
                        <button
                          className="archive-file-remove-btn"
                          onClick={() => removeCreateFile(idx)}
                          title="Remove file"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Archive Settings Card */}
              {createFiles.length > 0 && (
                <div className="archive-settings-card">
                  {/* Name Input */}
                  <div className="archive-setting-group">
                    <label>Archive Name</label>
                    <div className="archive-name-input-wrap">
                      <input
                        type="text"
                        value={archiveName}
                        onChange={(e) => setArchiveName(e.target.value)}
                        placeholder="archive"
                      />
                      <span>.{archiveFormat}</span>
                    </div>
                  </div>

                  {/* Format Selector */}
                  <div className="archive-setting-group">
                    <label>Target Format</label>
                    <div className="archive-format-pills">
                      {[
                        { id: 'zip', label: '.ZIP (Universal)' },
                        { id: 'tar', label: '.TAR (Uncompressed)' },
                        { id: 'tar.gz', label: '.TAR.GZ (Linux/Server)' },
                      ].map(f => (
                        <button
                          key={f.id}
                          className={`archive-format-pill ${archiveFormat === f.id ? 'archive-format-pill--active' : ''}`}
                          onClick={() => setArchiveFormat(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compression Level (for ZIP) */}
                  {archiveFormat === 'zip' && (
                    <div className="archive-setting-group">
                      <label>Compression Level</label>
                      <div className="archive-compression-grid">
                        {COMPRESSION_LEVELS.map(lvl => (
                          <div
                            key={lvl.id}
                            className={`archive-compression-card ${compressionLevel === lvl.id ? 'archive-compression-card--active' : ''}`}
                            onClick={() => setCompressionLevel(lvl.id)}
                          >
                            <div className="archive-compression-card__title">{lvl.label}</div>
                            <div className="archive-compression-card__desc">{lvl.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create Button */}
                  <button
                    className="archive-create-submit-btn"
                    onClick={handleCreateArchive}
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Compiling Archive... {createProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Archive size={18} />
                        <span>Create &amp; Download {archiveFormat.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
