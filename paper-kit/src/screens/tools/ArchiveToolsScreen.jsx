import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, X, Plus, FolderOpen } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { runArchiveOp } from '../../services/jobs';
import { useJob } from '../../hooks/useJob';
import JobProgressBar from '../../components/ui/JobProgressBar';
import './ArchiveToolsScreen.css';

export default function ArchiveToolsScreen() {
  const [params]    = useSearchParams();
  const initialOp   = params.get('op') || 'extract';

  const [selectedOp, setSelectedOp]       = useState(initialOp);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState('');
  const [jobId, setJobId]                 = useState(null);
  const fileInputRef = useRef();

  const { job, cancel } = useJob(jobId);

  const isCreate = selectedOp === 'create_zip';
  const accept   = isCreate ? '*/*' : '.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed';

  async function handleFile(e) {
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError('');
    try {
      const results = await Promise.all(files.map(f => uploadFile(f)));
      const newFiles = results.map((r, i) => ({ id: r._id, name: files[i].name, size: files[i].size }));
      if (isCreate) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
      } else {
        setUploadedFiles([newFiles[0]]);
      }
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
    if (!uploadedFiles.length) return;
    try {
      const fileIds = uploadedFiles.map(f => f.id);
      const jobDoc = await runArchiveOp(selectedOp, fileIds);
      setJobId(jobDoc.jobId);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Failed to start job');
    }
  }

  function handleReset() {
    setJobId(null);
    setUploadedFiles([]);
    setUploadError('');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="arc-tools">
      {/* Op selector tabs */}
      <div className="arc-tools__tabs">
        <button id="arc-tab-extract"
          className={`arc-tools__tab ${selectedOp === 'extract' ? 'arc-tools__tab--active' : ''}`}
          onClick={() => { setSelectedOp('extract'); handleReset(); }}>
          <FolderOpen size={18} /> Extract Archive
        </button>
        <button id="arc-tab-create"
          className={`arc-tools__tab ${selectedOp === 'create_zip' ? 'arc-tools__tab--active' : ''}`}
          onClick={() => { setSelectedOp('create_zip'); handleReset(); }}>
          <Archive size={18} /> Create ZIP
        </button>
      </div>

      <div className="arc-tools__body">
        <div className="arc-tools__header">
          <h1 className="arc-tools__title">
            {isCreate ? '📦 Create ZIP Archive' : '🗂️ Extract Archive'}
          </h1>
          <p className="arc-tools__subtitle">
            {isCreate
              ? 'Select multiple files to compress into a single ZIP archive'
              : 'Extract files from ZIP, RAR, or 7Z archives'}
          </p>
        </div>

        {/* Upload area */}
        {!jobId && (
          <>
            <div className="arc-tools__drop-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleFile}
              onClick={() => fileInputRef.current?.click()}
              id="arc-drop-zone" role="button" tabIndex={0}>
              <input ref={fileInputRef} type="file" accept={accept}
                multiple={isCreate} hidden onChange={handleFile} id="arc-file-input" />
              {uploading ? (
                <div className="arc-tools__uploading">
                  <div className="arc-tools__spinner" />
                  <span>Uploading…</span>
                </div>
              ) : (
                <>
                  <div className="arc-tools__drop-icon"><Archive size={44} /></div>
                  <p className="arc-tools__drop-title">
                    {isCreate ? 'Drop files to archive' : 'Drop your archive here'}
                  </p>
                  <p className="arc-tools__drop-sub">
                    {isCreate ? 'or click to select files' : 'ZIP, RAR, or 7Z formats'}
                  </p>
                </>
              )}
            </div>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="arc-tools__file-list">
                <div className="arc-tools__file-list-header">
                  <span className="arc-tools__file-count">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected</span>
                  {isCreate && (
                    <button className="arc-tools__add-more" onClick={() => fileInputRef.current?.click()} id="arc-add-more">
                      <Plus size={14} /> Add more
                    </button>
                  )}
                </div>
                {uploadedFiles.map((f, i) => (
                  <div key={f.id} className="arc-tools__file-item">
                    <div className="arc-tools__file-icon">📄</div>
                    <div className="arc-tools__file-info">
                      <span className="arc-tools__file-name">{f.name}</span>
                      <span className="arc-tools__file-size">{formatSize(f.size)}</span>
                    </div>
                    <button className="arc-tools__file-remove" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} id={`arc-remove-${i}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button className="arc-tools__process-btn" onClick={handleProcess} id="arc-process-btn">
                  {isCreate ? '📦 Create ZIP' : '🗂️ Extract Files'}
                </button>
              </div>
            )}
          </>
        )}

        {uploadError && <div className="arc-tools__error">{uploadError}</div>}

        {/* Job progress */}
        {jobId && (
          <div className="arc-tools__job">
            <JobProgressBar job={job} onCancel={cancel} />
            {['COMPLETED','FAILED','CANCELLED'].includes(job?.status) && (
              <button className="arc-tools__reset-btn" onClick={handleReset} id="arc-new-job">
                {job?.status === 'COMPLETED' ? 'Process Another' : 'Try Again'}
              </button>
            )}
          </div>
        )}

        {/* Format info */}
        {!uploadedFiles.length && !jobId && (
          <div className="arc-tools__format-info">
            {isCreate ? (
              <div className="arc-tools__info-grid">
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">📦</span><strong>ZIP</strong><small>DEFLATE compression</small></div>
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">🔒</span><strong>Secure</strong><small>All file types</small></div>
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">⚡</span><strong>Fast</strong><small>Instant creation</small></div>
              </div>
            ) : (
              <div className="arc-tools__info-grid">
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">🗜️</span><strong>ZIP</strong><small>Universal format</small></div>
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">📁</span><strong>RAR</strong><small>Requires unrar</small></div>
                <div className="arc-tools__info-card"><span className="arc-tools__info-icon">7️⃣</span><strong>7Z</strong><small>High compression</small></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
