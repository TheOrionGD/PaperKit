/* ClassifyPDFScreen — AI Document Classification (Feature 14 of gv) */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Sparkles, FileText, Upload, ArrowRight, Layers } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { classifyDocument } from '../../services/ai';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

const CATEGORY_COLORS = {
  'Research Paper': { bg: '#DBEAFE', fg: '#2563EB', icon: '🎓' },
  'Resume / CV': { bg: '#D1FAE5', fg: '#059669', icon: '💼' },
  'Assignment / Homework': { bg: '#FEF3C7', fg: '#D97706', icon: '📝' },
  'Report / Analysis': { bg: '#EDE9FE', fg: '#7C3AED', icon: '📊' },
  'Invoice / Receipt': { bg: '#FCE7F3', fg: '#DB2777', icon: '🧾' },
  'Contract / Legal Agreement': { bg: '#FEE2E2', fg: '#DC2626', icon: '⚖️' },
  'Certificate / Award': { bg: '#CCFBF1', fg: '#0D9488', icon: '🏆' },
  'Form / Application': { bg: '#E0E7FF', fg: '#4F46E5', icon: '📋' },
  'Presentation': { bg: '#FFEDD5', fg: '#EA580C', icon: '📽️' },
  'Other': { bg: '#F3F4F6', fg: '#4B5563', icon: '📄' },
};

export default function ClassifyPDFScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [classification, setClassification] = useState(null);
  const [error, setError] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setClassification(null);
    setError(null);
    e.target.value = '';
  }

  async function handleClassify() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setClassification(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const result = await classifyDocument(fileId);
      setClassification(result);
      showToast('Document classified successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Classification failed.');
    } finally {
      setRunning(false);
    }
  }

  const catStyle = (classification && CATEGORY_COLORS[classification.category]) || CATEGORY_COLORS['Other'];

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Upload Document for Classification</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? ' ai-screen__file-picker--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          id="classify-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" color="var(--color-primary)" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select a PDF to automatically identify type…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="classify-file-input"
        />
      </div>

      {/* Classify Button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleClassify}
          disabled={running}
          id="classify-submit-btn"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Classifying Document Type & Structure…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              {selectedFile ? 'Classify Document with AI' : 'Select PDF to Classify'}
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
              <Grid size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Identifying document category…</p>
            <p className="ai-screen__loading-sub">Analyzing layout, terminology, and structural sections</p>
          </div>
        )}

        {classification && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Primary category card */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--color-divider)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{catStyle.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Detected Category
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: catStyle.fg, marginBottom: '6px' }}>
                {classification.category}
              </div>
              <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: catStyle.bg, color: catStyle.fg, fontSize: '12px', fontWeight: 700 }}>
                {classification.confidence || 90}% Confidence
              </div>

              {classification.summary && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '14px', lineHeight: 1.5 }}>
                  {classification.summary}
                </p>
              )}
            </div>

            {/* Key Sections Identified */}
            {classification.key_sections && classification.key_sections.length > 0 && (
              <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="var(--color-primary)" /> Key Structural Sections
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {classification.key_sections.map((sec, idx) => (
                    <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600 }}>
                      ✓ {sec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Next Tools / Smart Workflow */}
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Recommended Operations for this {classification.category}:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/ai/extract-info', { state: { targetSchema: classification.category } })}
                  style={{ padding: '10px', borderRadius: '10px', background: 'var(--color-primary-soft)', border: '1px solid var(--color-divider)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span>Extract Structured Information & Tables</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/ai/summarize')}
                  style={{ padding: '10px', borderRadius: '10px', background: 'var(--color-primary-soft)', border: '1px solid var(--color-divider)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span>Generate Executive Summary & Findings</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!classification && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <Grid size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Automated Document Classifier</p>
            <p className="ai-screen__unavailable-sub">PaperKit identifies whether a document is a research paper, resume, invoice, contract, or form.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
