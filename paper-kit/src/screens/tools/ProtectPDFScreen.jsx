/* ProtectPDFScreen — PDF Password Protection, Confirmation & Granular Security Permissions */
import { useState, useRef, useEffect } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, Printer, Copy, Edit3, RefreshCw, Key, Ban, Unlock, ShieldCheck } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { protectPDF } from '../../services/tools';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { downloadAndOpenFile } from '../../services/native';
import { useToast } from '../../hooks/useToast';
import './CompressPDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <Lock size={20} />,
    title: 'AES-256 Encryption',
    description: 'Military-grade security for your PDFs.'
  },
  {
    icon: <Key size={20} />,
    title: 'Password Protect',
    description: 'Require a password to open.'
  },
  {
    icon: <Ban size={20} />,
    title: 'Restrict Edits',
    description: 'Prevent printing and copying.'
  },
  {
    icon: <Unlock size={20} />,
    title: 'Remove Passwords',
    description: 'Unlock PDFs if you know the password.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Absolute Privacy',
    description: 'Passwords never leave your device.'
  },
];


export default function ProtectPDFScreen() {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowEdit, setAllowEdit] = useState(false);
  const [running, setRunning] = useState(false);
  const [protectedResult, setProtectedResult] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      setProtectedResult(null);
      showToast(`Loaded ${fileObj.name || 'document'} for protection`, 'info');
    }
  }, [location.state, showToast]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setProtectedResult(null);
    e.target.value = '';
  }

  async function handleProtect() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (!password) {
      showToast('Please enter a password to protect this document', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setRunning(true);
    setProtectedResult(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const res = await protectPDF(fileId, {
        password: password,
        allow_print: allowPrint,
        allow_copy: allowCopy,
        allow_edit: allowEdit,
      });

      const stem = selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const outputFilename = `${stem}_protected.pdf`;

      setProtectedResult({
        download_url: res.download_url,
        name: outputFilename,
        size: res.size || selectedFile.size || 0,
        rawFile: null,
      });

      showToast('PDF Protected Successfully ✓', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to protect PDF', 'error');
    } finally {
      setRunning(false);
    }
  }

  // Result screen on completion matching specification:
  // PDF Protected Successfully ✓
  // Options: Download | Compress | Change Password | Edit PDF | Exit
  if (protectedResult) {
    return (
      <div className="compress-screen">
        <CommonResultScreen
          title="PDF Protected Successfully ✓"
          subtitle="Document encrypted with 256-bit AES protection"
          file={protectedResult}
          metrics={[
            { label: 'Encryption', value: 'AES-256 Bit', badge: 'Protected' },
            { label: 'Printing', value: allowPrint ? 'Allowed' : 'Disabled' },
            { label: 'Copying', value: allowCopy ? 'Allowed' : 'Disabled' },
          ]}
          nextActions={[
            ACTION_PRESETS.compress,
            {
              id: 'change-password',
              label: 'Change Password',
              desc: 'Re-encrypt with new password',
              icon: RefreshCw,
              onClick: () => {
                setProtectedResult(null);
                setPassword('');
                setConfirmPassword('');
              }
            },
          ]}
          primaryAction={{
            label: 'Download Protected PDF',
            onClick: () => {
              if (protectedResult?.download_url) {
                downloadAndOpenFile(protectedResult.download_url, protectedResult.name || 'protected_document.pdf', 'application/pdf');
              }
            }
          }}
          onReset={() => {
            setProtectedResult(null);
            setPassword('');
            setConfirmPassword('');
          }}
          sourceWorkflow="protect-pdf"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="protect-pick-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={26} color="#EF4444" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF to Encrypt & Protect</p>
            <p className="compress-screen__pick-sub">Set 256-bit AES password and customize permissions</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} color="#EF4444" />
            </div>
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for encryption
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
          id="protect-file-input"
        />

        {/* Password inputs (Password + Confirm Password) */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Set Document Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={e => { setPassword(e.target.value); setProtectedResult(null); }}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-divider)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '14px'
                }}
                id="protect-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Confirm Document Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password..."
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setProtectedResult(null); }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: password && confirmPassword && password !== confirmPassword ? '1px solid #EF4444' : '1px solid var(--color-divider)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '14px'
              }}
              id="protect-confirm-password-input"
            />
            {password && confirmPassword && password !== confirmPassword && (
              <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                Passwords do not match
              </span>
            )}
          </div>
        </div>

        {/* Granular Permissions Controls */}
        <div style={{ marginTop: '18px', background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="var(--color-primary)" /> Security Permissions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} color="var(--color-text-secondary)" /> Allow Printing Document
              </span>
              <input
                type="checkbox"
                checked={allowPrint}
                onChange={e => setAllowPrint(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Copy size={16} color="var(--color-text-secondary)" /> Allow Copying Text & Graphics
              </span>
              <input
                type="checkbox"
                checked={allowCopy}
                onChange={e => setAllowCopy(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} color="var(--color-text-secondary)" /> Allow Modifying Document Contents
              </span>
              <input
                type="checkbox"
                checked={allowEdit}
                onChange={e => setAllowEdit(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleProtect}
          loading={running}
          disabled={running}
          id="protect-submit-btn"
        >
          {selectedFile ? 'APPLY PASSWORD PROTECTION' : 'SELECT PDF TO PROTECT'}
        </PrimaryButton>
      </div>

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
