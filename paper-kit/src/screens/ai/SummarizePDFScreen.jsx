/* SummarizePDFScreen — AI-powered PDF summarization */
import { useState, useRef } from "react";
import { FileText, Sparkles, Copy, Download, Upload, Check } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import { useProcessing } from "../../context/ProcessingContext";
import "../ai/ai-screen.css";

const LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German", "Arabic",
  "Portuguese", "Chinese", "Japanese", "Korean", "Italian", "Russian",
];

export default function SummarizePDFScreen() {
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get("file_id");
  const filenameParam = searchParams.get("filename");

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(() => {
    if (fileIdParam) {
      return { id: fileIdParam, name: filenameParam || "Selected Document.pdf" };
    }
    return null;
  });
  const [language, setLanguage] = useState("English");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast: _showToast, dismissToast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSummary(null);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleSummarize() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setSummary(null);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('summarize-pdf', { file: inputVal, language });
      setSummary(res.summary);
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
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">PDF Document</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          id="summarize-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Tap to choose a PDF file…</span>
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

      {/* Language option */}
      <div className="ai-screen__options">
        <div className="ai-screen__options-row">
          <span className="ai-screen__options-label">Language</span>
          <select
            className="ai-screen__select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            id="summarize-language-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit */}
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
              Summarizing…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              {selectedFile ? 'Summarize PDF' : 'Select PDF to Summarize'}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && <div className="ai-screen__error">{error}</div>}

      {/* Result */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb">
              <Sparkles size={24} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Generating summary…</p>
            <p className="ai-screen__loading-sub">This may take a few seconds</p>
          </div>
        )}

        {summary && !running && (
          <>
            <div className="ai-screen__result-header">
              <span className="ai-screen__result-title">Summary</span>
              <div className="ai-screen__result-actions">
                <button
                  className={`ai-screen__result-action-btn${copied ? " ai-screen__result-action-btn--primary" : ""}`}
                  onClick={handleCopy}
                  id="summarize-copy-btn"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  className="ai-screen__result-action-btn"
                  onClick={handleDownload}
                  id="summarize-download-btn"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </div>
            <div className="ai-screen__result-box">{summary}</div>
          </>
        )}

        {!summary && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: "var(--color-primary-soft)" }}>
              <Sparkles size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Ready to summarize</p>
            <p className="ai-screen__unavailable-sub">Choose a PDF and tap the button above to get an AI-generated summary.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
