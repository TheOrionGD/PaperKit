/* QualityCheckerScreen — Document Quality Checker & Executive Report Card (Feature 25 of gv) */
import { useState, useRef } from 'react';
import { ShieldCheck, FileText, Upload, CheckCircle2, AlertTriangle, XCircle, Download, Award } from 'lucide-react';
import { qualityCheckDocument } from '../../services/ai';
import { uploadFile } from '../../services/files';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

const STATUS_ICONS = {
  pass: <CheckCircle2 size={16} color="#10B981" />,
  warning: <AlertTriangle size={16} color="#F59E0B" />,
  fail: <XCircle size={16} color="#EF4444" />,
};

export default function QualityCheckerScreen() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setReport(null);
    setError(null);
    e.target.value = '';
  }

  async function handleAudit() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const res = await qualityCheckDocument(fileId);
      setReport(res);
      showToast('Document Quality Report generated!', 'success');
    } catch (err) {
      setError(err.message || 'Quality check failed.');
    } finally {
      setRunning(false);
    }
  }

  function handleDownloadReport() {
    if (!report) return;
    const text = `# Document Quality Report
Document: ${selectedFile?.name || 'Document'}
Overall Quality Score: ${report.overall_score || 85}/100
Readability: ${report.readability_grade || 'Standard'}

## Executive Summary
${report.summary || ''}

## Quality Audit Checklist
${(report.items || []).map(item => `- [${item.status?.toUpperCase()}] ${item.name}: ${item.message}`).join('\n')}

## Actionable Recommendations
${(report.recommendations || []).map(r => `- ${r}`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name?.split('.')[0] || 'quality'}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const score = report?.overall_score || 85;

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Document for Quality Audit</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? ' ai-screen__file-picker--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          id="quality-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" color="var(--color-primary)" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select Research Paper, Essay, or Report…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="quality-file-input"
        />
      </div>

      {/* Action button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleAudit}
          disabled={running}
          id="quality-submit-btn"
          style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Auditing Document Quality & Structure…
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Run Document Quality Audit
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb" style={{ background: '#0D9488' }}>
              <ShieldCheck size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Analyzing headings, citations & consistency…</p>
            <p className="ai-screen__loading-sub">Checking readability index, missing sections, and formatting</p>
          </div>
        )}

        {report && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Score Banner */}
            <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Document Quality Score
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: score >= 85 ? '#10B981' : score >= 65 ? '#F59E0B' : '#EF4444' }}>
                  {score}/100
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Readability: <strong>{report.readability_grade || 'Standard'}</strong>
                </div>
              </div>
              <Award size={48} color={score >= 85 ? '#10B981' : '#F59E0B'} style={{ opacity: 0.8 }} />
            </div>

            {/* Checklist */}
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                Structure & Criteria Audit
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(report.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                    <div style={{ marginTop: '2px' }}>
                      {STATUS_ICONS[item.status?.toLowerCase()] || STATUS_ICONS.pass}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div style={{ background: 'var(--color-primary-soft)', padding: '14px', borderRadius: '12px', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
                  Actionable Improvement Tips
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {report.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadReport}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Download Quality Report (.MD)
            </button>
          </div>
        )}

        {!report && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <ShieldCheck size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Document Quality Audit</p>
            <p className="ai-screen__unavailable-sub">Analyze formatting consistency, citation structure, heading hierarchy, and grammar before submitting.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
