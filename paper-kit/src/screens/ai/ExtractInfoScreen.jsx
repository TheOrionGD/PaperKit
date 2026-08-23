/* ExtractInfoScreen — Intelligent Information Extraction (Feature 15 of gv) */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Upload, Copy, Download, Check, Database, Table } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { extractInformation } from '../../services/ai';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

const SCHEMAS = [
  { id: 'auto',            label: 'Auto-Detect Schema' },
  { id: 'invoice',         label: 'Invoice / Receipt' },
  { id: 'research_paper',  label: 'Research Paper' },
  { id: 'resume',          label: 'Resume / CV' },
  { id: 'contract',        label: 'Contract / Agreement' },
  { id: 'form',            label: 'Form / Application' },
];

export default function ExtractInfoScreen() {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [schemaType, setSchemaType] = useState('auto');
  const [running, setRunning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (location.state?.targetSchema) {
      const lower = location.state.targetSchema.toLowerCase();
      if (lower.includes('invoice')) setSchemaType('invoice');
      else if (lower.includes('research')) setSchemaType('research_paper');
      else if (lower.includes('resume')) setSchemaType('resume');
      else if (lower.includes('contract')) setSchemaType('contract');
    }
  }, [location.state]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setExtractedData(null);
    setError(null);
    e.target.value = '';
  }

  async function handleExtract() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setExtractedData(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const result = await extractInformation(fileId, schemaType);
      setExtractedData(result);
      showToast('Structured information extracted!', 'success');
    } catch (err) {
      setError(err.message || 'Information extraction failed.');
    } finally {
      setRunning(false);
    }
  }

  function handleCopyJSON() {
    if (!extractedData) return;
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadJSON() {
    if (!extractedData) return;
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name?.split('.')[0] || 'extracted'}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Document for Field Extraction</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? ' ai-screen__file-picker--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          id="extract-info-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" color="var(--color-primary)" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select Invoice, Resume, Research Paper, or Contract…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="extract-info-file-input"
        />
      </div>

      {/* Schema selector pills */}
      <div style={{ marginTop: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Target Schema</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {SCHEMAS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSchemaType(s.id); setExtractedData(null); }}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: schemaType === s.id ? 700 : 500,
                border: schemaType === s.id ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: schemaType === s.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: schemaType === s.id ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleExtract}
          disabled={running}
          id="extract-info-submit-btn"
          style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Extracting Key-Values & Structured Tables…
            </>
          ) : (
            <>
              <Database size={17} />
              Extract Structured Information
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb" style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
              <Database size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Extracting structured entities…</p>
            <p className="ai-screen__loading-sub">Parsing metadata, amounts, line items, and authors</p>
          </div>
        )}

        {extractedData && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header actions */}
            <div className="ai-screen__result-header">
              <span className="ai-screen__result-title">
                Extracted Fields ({extractedData.schema_detected || schemaType})
              </span>
              <div className="ai-screen__result-actions">
                <button
                  className={`ai-screen__result-action-btn${copied ? ' ai-screen__result-action-btn--primary' : ''}`}
                  onClick={handleCopyJSON}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                <button className="ai-screen__result-action-btn" onClick={handleDownloadJSON}>
                  <Download size={13} />
                  Download JSON
                </button>
              </div>
            </div>

            {/* Key-Value Fields Card Grid */}
            {extractedData.fields && Object.keys(extractedData.fields).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {Object.entries(extractedData.fields).map(([k, v], idx) => (
                  <div key={idx} style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-divider)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'capitalize', marginBottom: '4px' }}>
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', wordBreak: 'break-word' }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Extracted Tables */}
            {extractedData.tables && extractedData.tables.length > 0 && (
              <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Table size={16} color="var(--color-primary)" /> Extracted Tabular Items
                </div>
                {extractedData.tables.map((tbl, tIdx) => (
                  <div key={tIdx} style={{ overflowX: 'auto', marginBottom: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-primary-soft)' }}>
                          {(tbl.headers || []).map((h, hIdx) => (
                            <th key={hIdx} style={{ padding: '8px', border: '1px solid var(--color-divider)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(tbl.rows || []).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {(Array.isArray(row) ? row : Object.values(row)).map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: '8px', border: '1px solid var(--color-divider)' }}>{String(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!extractedData && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <Database size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Intelligent Information Extraction</p>
            <p className="ai-screen__unavailable-sub">Extract key invoice metadata, resume experience, research methods, and contract obligations into structured JSON.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
