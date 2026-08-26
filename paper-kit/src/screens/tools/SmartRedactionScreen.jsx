/* SmartRedactionScreen — AI Privacy Detection & Irreversible Blackout Redaction (Features 19, 20 of gv) */
import { useState, useRef } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { EyeOff, Sparkles, ShieldAlert, CheckCircle2, Download, Plus, Eraser, Search, ShieldCheck } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { detectPrivacy } from '../../services/ai';
import { redactPDF } from '../../services/tools';
import { downloadAndOpenFile } from '../../services/native';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './CompressPDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <EyeOff size={20} />,
    title: 'Auto-Redact',
    description: 'Automatically hide SSNs, emails, and cards.'
  },
  {
    icon: <Eraser size={20} />,
    title: 'Manual Redaction',
    description: 'Draw black boxes over sensitive text.'
  },
  {
    icon: <Search size={20} />,
    title: 'Search & Destroy',
    description: 'Find specific words and redact them all.'
  },
  {
    icon: <ShieldAlert size={20} />,
    title: 'True Removal',
    description: 'Text is permanently deleted, not just hidden.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Ultimate Security',
    description: 'Redacted offline for maximum safety.'
  },
];


export default function SmartRedactionScreen() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [privacyResult, setPrivacyResult] = useState(null);
  const [selectedTerms, setSelectedTerms] = useState(new Set());
  const [customTerm, setCustomTerm] = useState('');
  const [redacting, setRedacting] = useState(false);
  const [redactedResult, setRedactedResult] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPrivacyResult(null);
    setRedactedResult(null);
    setSelectedTerms(new Set());
    e.target.value = '';
  }

  async function handleScanPII() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setScanning(true);
    setPrivacyResult(null);
    setRedactedResult(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fid = uploadRes._id || uploadRes.id;
      setFileId(fid);

      const res = await detectPrivacy(fid);
      setPrivacyResult(res);

      // Pre-select all detected sensitive entities for redaction
      const termsSet = new Set((res.entities || []).map(e => e.value).filter(Boolean));
      setSelectedTerms(termsSet);

      if (termsSet.size > 0) {
        showToast(`Detected ${termsSet.size} sensitive entities!`, 'warning');
      } else {
        showToast('No obvious sensitive entities detected. You can add custom terms.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Privacy scan failed.', 'error');
    } finally {
      setScanning(false);
    }
  }

  function toggleTerm(val) {
    setSelectedTerms(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function handleAddCustomTerm() {
    if (!customTerm.trim()) return;
    setSelectedTerms(prev => new Set(prev).add(customTerm.trim()));
    setCustomTerm('');
  }

  async function handleApplyRedactions() {
    if (selectedTerms.size === 0) {
      showToast('Select or enter at least 1 term to redact', 'warning');
      return;
    }
    if (!fileId) return;

    setRedacting(true);
    try {
      const termsList = Array.from(selectedTerms);
      const res = await redactPDF(fileId, termsList);
      setRedactedResult(res);
      showToast('Redactions irreversibly applied to PDF!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to apply redactions', 'error');
    } finally {
      setRedacting(false);
    }
  }

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="redact-pick-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'rgba(249, 115, 22, 0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={26} color="#EA580C" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF for Privacy Scan & Redaction</p>
            <p className="compress-screen__pick-sub">Auto-detect phone numbers, emails, SSN, PAN, and credentials</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={20} color="#EA580C" />
            </div>
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for privacy scan
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
          id="redact-file-input"
        />

        {/* Scan Action */}
        {!privacyResult && (
          <div style={{ marginTop: '16px' }}>
            <PrimaryButton
              onClick={handleScanPII}
              loading={scanning}
              disabled={scanning || !selectedFile}
              id="redact-scan-btn"
              style={{ background: 'linear-gradient(135deg, #EA580C, #DC2626)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={16} /> Scan for Sensitive PII Data
              </span>
            </PrimaryButton>
          </div>
        )}

        {/* Sensitive Entities Checklist */}
        {privacyResult && !redactedResult && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} color="#EA580C" /> Sensitive Items to Redact ({selectedTerms.size} selected)
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                  RISK: {privacyResult.risk_level || 'MEDIUM'}
                </span>
              </div>

              {/* Detected entities list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '12px' }}>
                {(privacyResult.entities || []).map((ent, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: selectedTerms.has(ent.value) ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
                      border: '1px solid var(--color-divider)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#EF4444' }}>[{ent.type}] </span>
                      <span style={{ fontFamily: 'monospace' }}>{ent.value}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTerms.has(ent.value)}
                      onChange={() => toggleTerm(ent.value)}
                      style={{ accentColor: '#EF4444', width: '16px', height: '16px' }}
                    />
                  </label>
                ))}
              </div>

              {/* Add custom text/term to redact */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Add custom text or name to blackout..."
                  value={customTerm}
                  onChange={e => setCustomTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTerm(); }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomTerm}
                  style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Apply Redaction Button */}
            <PrimaryButton
              onClick={handleApplyRedactions}
              loading={redacting}
              disabled={redacting || selectedTerms.size === 0}
              id="redact-apply-btn"
              style={{ background: '#111827' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <EyeOff size={16} /> BLACKOUT & REDACT SELECTED ({selectedTerms.size})
              </span>
            </PrimaryButton>
          </div>
        )}

        {/* Result Card */}
        {redactedResult && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <CheckCircle2 size={20} color="#10B981" />
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#10B981' }}>
                Sanitized PDF Generated with Permanent Blackout Redaction!
              </span>
            </div>
            <button
              type="button"
              onClick={() => downloadAndOpenFile(redactedResult.download_url, `${selectedFile?.name?.split('.')[0] || 'redacted'}_safe.pdf`, 'application/pdf')}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: 'pointer', width: '100%', padding: '12px', borderRadius: '10px', background: '#10B981', color: '#fff', fontWeight: 600 }}
            >
              <Download size={16} /> Download Sanitized Safe PDF
            </button>
          </div>
        )}
      </div>

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
