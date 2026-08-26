/* MetadataScreen — View, Edit, and Sanitize PDF Metadata for Privacy (Feature 24 of gv) */
import { useState, useRef } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { Info, Trash2, Save, Download, CheckCircle2, FileText, Search, Zap, ShieldCheck } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { getPDFMetadata, updatePDFMetadata } from '../../services/tools';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './CompressPDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <FileText size={20} />,
    title: 'Edit Properties',
    description: 'Change Title, Author, and Subject.'
  },
  {
    icon: <Search size={20} />,
    title: 'SEO Optimized',
    description: 'Add keywords for better searchability.'
  },
  {
    icon: <Trash2 size={20} />,
    title: 'Scrub Metadata',
    description: 'Remove hidden data for privacy.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Instant Save',
    description: 'Changes apply without re-encoding.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Secure Edits',
    description: 'Processed locally in your browser.'
  },
];


export default function MetadataScreen() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [metadata, setMetadata] = useState({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '' });
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedResult, setUpdatedResult] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUpdatedResult(null);
    setLoading(true);

    try {
      const uploadRes = await uploadFile(file);
      const fid = uploadRes._id || uploadRes.id;
      setFileId(fid);

      const res = await getPDFMetadata(fid);
      if (res.metadata) {
        setMetadata({
          title: res.metadata.title || '',
          author: res.metadata.author || '',
          subject: res.metadata.subject || '',
          keywords: res.metadata.keywords || '',
          creator: res.metadata.creator || '',
          producer: res.metadata.producer || '',
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to inspect metadata', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMetadata(wipeAll = false) {
    if (!fileId) return;
    setSaving(true);
    setUpdatedResult(null);

    try {
      const res = await updatePDFMetadata(fileId, metadata, wipeAll);
      setUpdatedResult(res);
      if (wipeAll) {
        setMetadata({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '' });
        showToast('All PDF metadata wiped for privacy!', 'success');
      } else {
        showToast('PDF metadata updated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update metadata', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="metadata-pick-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'rgba(37, 99, 235, 0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={26} color="var(--color-primary)" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF to Manage Metadata</p>
            <p className="compress-screen__pick-sub">View author, creation dates, or wipe all metadata for privacy</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={20} color="var(--color-primary)" />
            </div>
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for metadata inspection
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="metadata-file-input"
        />

        {selectedFile && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Document Metadata Fields</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Document Title</label>
                  <input
                    type="text"
                    placeholder="Document Title"
                    value={metadata.title}
                    onChange={e => setMetadata({ ...metadata, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Author / Owner</label>
                  <input
                    type="text"
                    placeholder="Author Name"
                    value={metadata.author}
                    onChange={e => setMetadata({ ...metadata, author: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Subject</label>
                  <input
                    type="text"
                    placeholder="Document Subject or Description"
                    value={metadata.subject}
                    onChange={e => setMetadata({ ...metadata, subject: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Keywords (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. report, annual, college"
                    value={metadata.keywords}
                    onChange={e => setMetadata({ ...metadata, keywords: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <PrimaryButton
                onClick={() => handleSaveMetadata(false)}
                loading={saving}
                disabled={saving}
                style={{ flex: 1 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={15} /> Save Metadata
                </span>
              </PrimaryButton>
              <SecondaryButton
                onClick={() => handleSaveMetadata(true)}
                disabled={saving}
                style={{ flex: 1, color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Trash2 size={15} /> Sanitize / Strip All
                </span>
              </SecondaryButton>
            </div>

            {/* Result */}
            {updatedResult && (
              <div style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#10B981' }}>
                    PDF Metadata Updated Successfully!
                  </span>
                </div>
                <a
                  href={updatedResult.download_url}
                  download={`${selectedFile?.name?.split('.')[0] || 'document'}_metadata.pdf`}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', padding: '10px', borderRadius: '8px', background: '#10B981', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                >
                  <Download size={15} /> Download Updated PDF
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
