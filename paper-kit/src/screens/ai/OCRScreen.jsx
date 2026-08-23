/* OCRScreen — Optical Character Recognition & Searchable PDF Creation */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Scan, Sparkles, Copy, Download, Upload, Check, FileText, Bot, Search, FileCheck } from 'lucide-react';
import { ocrDocument } from '../../services/ai';
import { uploadFile } from '../../services/files';
import api from '../../services/api';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

export default function OCRScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [ocrText, setOcrText] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('formatted'); // formatted | raw
  const [creatingSearchable, setCreatingSearchable] = useState(false);
  const [searchablePdfResult, setSearchablePdfResult] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      setOcrText(null);
    }
  }, [location.state]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setOcrText(null);
    setError(null);
    e.target.value = '';
  }

  async function handleRunOCR() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setOcrText(null);
    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const result = await ocrDocument(fileId);
      setOcrText(result.text || result.ocr || 'No text detected in document.');
      showToast('OCR analysis completed successfully!', 'success');
    } catch (err) {
      setError(err.message || 'OCR processing failed. Ensure server has Groq/Gemini configured.');
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadTxt() {
    if (!ocrText) return;
    const blob = new Blob([ocrText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name?.replace(/\.[^/.]+$/, "") || 'ocr_extracted'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateSearchablePDF() {
    if (!ocrText) return;
    setCreatingSearchable(true);
    try {
      const res = await api.post('/ai/searchable-pdf', {
        text: ocrText,
      });
      const downloadUrl = res.data.download_url?.startsWith('http')
        ? res.data.download_url
        : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${res.data.download_url}`;
      
      setSearchablePdfResult(downloadUrl);
      window.open(downloadUrl, '_blank');
      showToast('Searchable PDF created and opened!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create Searchable PDF', 'error');
    } finally {
      setCreatingSearchable(false);
    }
  }

  const wordCount = ocrText ? ocrText.trim().split(/\s+/).length : 0;
  const charCount = ocrText ? ocrText.length : 0;

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Scanned Document or Photo</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? ' ai-screen__file-picker--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          id="ocr-file-picker"
        >
          <Scan size={20} className="ai-screen__file-icon" color="var(--color-primary)" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select Scanned PDF, JPG, or PNG…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="ocr-file-input"
        />
      </div>

      {/* Action Button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleRunOCR}
          disabled={running}
          id="ocr-submit-btn"
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Running Multimodal OCR & Structure Recognition…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              {selectedFile ? 'Extract Text & Layout with OCR' : 'Choose Document for OCR'}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb">
              <Scan size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Recognizing characters & structured content…</p>
            <p className="ai-screen__loading-sub">Multimodal vision model is identifying text, headings, tables & lists</p>
          </div>
        )}

        {ocrText && !running && (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span><strong>{wordCount}</strong> Words</span>
                <span>•</span>
                <span><strong>{charCount}</strong> Characters</span>
                <span>•</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>Layout Detected ✓</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('formatted')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: activeTab === 'formatted' ? 700 : 500,
                    background: activeTab === 'formatted' ? 'var(--color-primary-soft)' : 'transparent',
                    color: activeTab === 'formatted' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: activeTab === 'raw' ? 700 : 500,
                    background: activeTab === 'raw' ? 'var(--color-primary-soft)' : 'transparent',
                    color: activeTab === 'raw' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Raw MD
                </button>
              </div>
            </div>

            <div className="ai-screen__result-box" style={{ whiteSpace: activeTab === 'raw' ? 'pre-wrap' : 'normal', maxHeight: '280px', overflowY: 'auto' }}>
              {ocrText}
            </div>

            {/* Quick Actions (Copy & Download) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className={`ai-screen__result-action-btn${copied ? ' ai-screen__result-action-btn--primary' : ''}`}
                onClick={handleCopy}
                style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Extracted Text'}</span>
              </button>
              <button
                type="button"
                className="ai-screen__result-action-btn"
                onClick={handleDownloadTxt}
                style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
              >
                <Download size={14} />
                <span>Download .MD</span>
              </button>
            </div>

            {searchablePdfResult && (
              <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>Searchable PDF Ready ✓</span>
                <a
                  href={searchablePdfResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                  Download PDF
                </a>
              </div>
            )}

            {/* ⭐ Smart Workflow Chaining Section matching spec:
                Options: AI Summarize | Ask AI | Search Document | Create Searchable PDF | Download Text | Exit */}
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '14px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--color-primary)" /> What would you like to do next?
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/ai/summarize', { state: { rawText: ocrText, chainedFile: selectedFile } })}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <FileText size={16} />
                  </div>
                  <p className="common-result__action-label">AI Summarize</p>
                  <p className="common-result__action-desc">Summarize extracted text</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ai/ask', { state: { rawText: ocrText, chainedFile: selectedFile } })}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <Bot size={16} />
                  </div>
                  <p className="common-result__action-label">Ask AI</p>
                  <p className="common-result__action-desc">Ask questions on text</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ai/search', { state: { rawText: ocrText, chainedFile: selectedFile } })}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <Search size={16} />
                  </div>
                  <p className="common-result__action-label">Search Document</p>
                  <p className="common-result__action-desc">Semantic search</p>
                </button>

                <button
                  type="button"
                  onClick={handleCreateSearchablePDF}
                  disabled={creatingSearchable}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <FileCheck size={16} />
                  </div>
                  <p className="common-result__action-label">{creatingSearchable ? 'Creating…' : 'Searchable PDF'}</p>
                  <p className="common-result__action-desc">Generate PDF with text</p>
                </button>
              </div>
            </div>
          </>
        )}

        {!ocrText && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <Scan size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Optical Character Recognition</p>
            <p className="ai-screen__unavailable-sub">Upload scanned PDFs or images to extract text, headings, paragraphs, tables, and lists.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
