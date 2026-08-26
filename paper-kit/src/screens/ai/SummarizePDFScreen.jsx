/* SummarizePDFScreen — AI Document Summarization with 5 Modes & PDF Report Generator */
import { useState, useRef, useEffect } from "react";
import { FileText, Sparkles, Copy, Download, Upload, Check, Bot, Search, RefreshCw, FileCheck } from "lucide-react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import ReactMarkdown from 'react-markdown';
import { useProcessing } from "../../context/ProcessingContext";
import { summarizePDF } from "../../services/ai";
import api from "../../services/api";
import "../ai/ai-screen.css";

const MODES = [
  { id: "short",        label: "Short Summary",    desc: "1-2 concise paragraphs" },
  { id: "detailed",     label: "Detailed Summary", desc: "Full executive overview" },
  { id: "key_points",   label: "Key Points",       desc: "Bulleted core insights" },
  { id: "findings",     label: "Important Findings", desc: "Critical discoveries" },
  { id: "keywords",     label: "Keywords",         desc: "Top domain terminology" },
];

export default function SummarizePDFScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fileIdParam = searchParams.get("file_id");
  const filenameParam = searchParams.get("filename");

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(() => {
    if (fileIdParam) {
      return { id: fileIdParam, name: filenameParam || "Selected Document.pdf" };
    }
    return null;
  });
  const [directText, setDirectText] = useState("");
  const [inputMode, setInputMode] = useState("file"); // file | text
  const [language, _setLanguage] = useState("English");
  const [mode, setMode] = useState("detailed");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (location.state?.rawText) {
      setDirectText(location.state.rawText);
      setInputMode("text");
      showToast('Loaded text for AI summarization', 'info');
    } else if (location.state?.chainedFile) {
      setSelectedFile(location.state.chainedFile);
      setInputMode("file");
    }
  }, [location.state, showToast]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSummary(null);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleSummarize() {
    if (inputMode === "file" && !selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (inputMode === "text" && !directText.trim()) {
      return;
    }
    setRunning(true);
    setError(null);
    setSummary(null);
    try {
      if (inputMode === "text" || directText) {
        const res = await summarizePDF(null, directText, language, mode);
        setSummary(res.summary);
      } else {
        const inputVal = selectedFile.id || selectedFile;
        const res = await runProcessing('summarize-pdf', { file: inputVal, language, mode });
        setSummary(res.summary);
      }
      showToast('Document summarized successfully!', 'success');
    } catch (err) {
      if (err.status === 503 || err.message?.toLowerCase().includes("api key") || err.message?.toLowerCase().includes("gemini")) {
        setError("AI service is currently unavailable. Please check the server configuration.");
      } else {
        setError(err.message || "Summarization failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFile?.name?.replace(/\.[^/.]+$/, "") || "document"}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGeneratePdfReport() {
    if (!summary) return;
    setGeneratingPdf(true);
    try {
      const docTitle = selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, "") : "Document";
      const res = await api.post('/ai/generate-report-pdf', {
        title: `${docTitle} — Executive Summary`,
        subtitle: `PaperKit AI Summarization Report (${mode.toUpperCase()})`,
        content: summary,
      });

      const downloadUrl = res.data.download_url?.startsWith('http')
        ? res.data.download_url
        : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${res.data.download_url}`;

      window.open(downloadUrl, '_blank');
      showToast('PDF Summary Report generated!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to generate PDF Report', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Target PDF Document</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          id="summarize-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose PDF file to summarize…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
          id="summarize-file-input"
        />
      </div>

      {/* Summary Mode Pill Selector (Short, Detailed, Key Points, Important Findings, Keywords) */}
      <div className="ai-screen__options-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
        <span className="ai-screen__options-label" style={{ fontWeight: 600, fontSize: '13px' }}>Summarization Format</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', width: '100%' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); setSummary(null); }}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                border: mode === m.id ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: mode === m.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: mode === m.id ? 'var(--color-primary)' : 'var(--color-text)',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px' }}>{m.label}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleSummarize}
          disabled={running}
          id="summarize-submit-btn"
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Analyzing document context & generating summary…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              {selectedFile || directText ? `Generate ${MODES.find(m => m.id === mode)?.label || 'Summary'}` : 'Select Document to Summarize'}
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
              <FileText size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Extracting core insights…</p>
            <p className="ai-screen__loading-sub">AI is synthesizing topics, key points, and critical takeaways</p>
          </div>
        )}

        {summary && !running && (
          <>
            <div className="ai-screen__result-header">
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                DOCUMENT SUMMARY ({MODES.find(m => m.id === mode)?.label.toUpperCase()})
              </span>
              <div className="ai-screen__result-actions">
                <button className={`ai-screen__result-action-btn${copied ? ' ai-screen__result-action-btn--primary' : ''}`} onClick={handleCopy}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="ai-screen__result-action-btn" onClick={handleDownload}>
                  <Download size={13} />
                  Download .MD
                </button>
              </div>
            </div>

            <div className="ai-screen__result-box markdown-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>

            {/* ⭐ Smart Workflow Chaining Section matching spec:
                Options: Download Summary | Ask AI | Search Document | Summarize Again | Generate PDF Report | Exit */}
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '14px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--color-primary)" /> What would you like to do next?
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleGeneratePdfReport}
                  disabled={generatingPdf}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <FileCheck size={16} />
                  </div>
                  <p className="common-result__action-label">{generatingPdf ? 'Generating…' : 'Generate PDF Report'}</p>
                  <p className="common-result__action-desc">Download styled PDF summary</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ai/ask', { state: { chainedFile: selectedFile, rawText: summary } })}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <Bot size={16} />
                  </div>
                  <p className="common-result__action-label">Ask AI</p>
                  <p className="common-result__action-desc">Ask questions on document</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ai/search', { state: { chainedFile: selectedFile } })}
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
                  onClick={() => { setSummary(null); }}
                  className="common-result__action-card"
                >
                  <div className="common-result__action-icon">
                    <RefreshCw size={16} />
                  </div>
                  <p className="common-result__action-label">Summarize Again</p>
                  <p className="common-result__action-desc">Try different mode/options</p>
                </button>
              </div>
            </div>
          </>
        )}

        {!summary && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <FileText size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">AI Document Summarizer</p>
            <p className="ai-screen__unavailable-sub">Select a PDF or paste text to generate high-fidelity executive summaries, key findings, and core insights.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
