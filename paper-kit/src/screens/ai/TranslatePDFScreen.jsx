/* TranslatePDFScreen — AI-powered Document & Text Translation */
import { useState, useRef, useEffect } from "react";
import { FileText, Languages, Copy, Download, Upload, Check } from "lucide-react";
import { useSearchParams, useLocation } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import ReactMarkdown from 'react-markdown';
import { useProcessing } from "../../context/ProcessingContext";
import { translateDocument } from "../../services/ai";
import "../ai/ai-screen.css";

const TARGET_LANGUAGES = [
  "Hindi", "Tamil", "Telugu", "Spanish", "French", "German", "Arabic", "Portuguese",
  "Chinese (Simplified)", "Japanese", "Korean", "Italian", "Russian",
  "Dutch", "Turkish", "Polish", "Swedish", "Bengali",
];

export default function TranslatePDFScreen() {
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
  const [targetLang, setTargetLang] = useState("Hindi");
  const [running, setRunning] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast: _showToast, dismissToast } = useToast();

  useEffect(() => {
    if (location.state?.rawText) {
      setDirectText(location.state.rawText);
      setInputMode("text");
    }
  }, [location.state]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setTranslation(null);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleTranslate() {
    if (inputMode === "file" && !selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (inputMode === "text" && !directText.trim()) {
      return;
    }

    setRunning(true);
    setError(null);
    setTranslation(null);

    try {
      if (inputMode === "text" || directText) {
        const res = await translateDocument(null, targetLang, directText);
        setTranslation(res.translated_text || res.translation);
      } else {
        const inputVal = selectedFile.id || selectedFile;
        const res = await runProcessing('translate-pdf', { file: inputVal, language: targetLang });
        setTranslation(res.translation);
      }
    } catch (err) {
      if (err.status === 503 || err.message?.toLowerCase().includes("api key") || err.message?.toLowerCase().includes("gemini")) {
        setError("AI service is currently unavailable. Please check the server configuration.");
      } else {
        setError(err.message || "Translation failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    if (!translation) return;
    navigator.clipboard.writeText(translation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!translation) return;
    const blob = new Blob([translation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation_${targetLang.toLowerCase().replace(/ /g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ai-screen">
      {/* Input Mode Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setInputMode('file')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: inputMode === 'file' ? 700 : 500,
            background: inputMode === 'file' ? 'var(--color-primary-soft)' : 'var(--color-surface)',
            color: inputMode === 'file' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: inputMode === 'file' ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
            cursor: 'pointer'
          }}
        >
          📄 PDF Document
        </button>
        <button
          type="button"
          onClick={() => setInputMode('text')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: inputMode === 'text' ? 700 : 500,
            background: inputMode === 'text' ? 'var(--color-primary-soft)' : 'var(--color-surface)',
            color: inputMode === 'text' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: inputMode === 'text' ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
            cursor: 'pointer'
          }}
        >
          ✍️ Direct Text / Notes
        </button>
      </div>

      {inputMode === 'file' ? (
        /* File picker */
        <div className="ai-screen__file-section">
          <span className="ai-screen__file-label">PDF Document</span>
          <button
            className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            id="translate-file-picker"
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
            id="translate-file-input"
          />
        </div>
      ) : (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Text to Translate</label>
          <textarea
            rows={4}
            placeholder="Type or paste text in any language..."
            value={directText}
            onChange={e => { setDirectText(e.target.value); setTranslation(null); }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-divider)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {/* Target language option */}
      <div className="ai-screen__options">
        <div className="ai-screen__options-row">
          <span className="ai-screen__options-label">Translate to</span>
          <select
            className="ai-screen__select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            id="translate-lang-select"
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleTranslate}
          disabled={running}
          id="translate-submit-btn"
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Translating…
            </>
          ) : (
            <>
              <Languages size={17} />
              {selectedFile ? `Translate to ${targetLang}` : 'Select PDF to Translate'}
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Result */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb">
              <Languages size={24} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Translating to {targetLang}…</p>
            <p className="ai-screen__loading-sub">This may take a few moments for longer documents</p>
          </div>
        )}

        {translation && !running && (
          <>
            <div className="ai-screen__result-header">
              <span className="ai-screen__result-title">Translation — {targetLang}</span>
              <div className="ai-screen__result-actions">
                <button
                  className={`ai-screen__result-action-btn${copied ? " ai-screen__result-action-btn--primary" : ""}`}
                  onClick={handleCopy}
                  id="translate-copy-btn"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  className="ai-screen__result-action-btn"
                  onClick={handleDownload}
                  id="translate-download-btn"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </div>
            <div className="ai-screen__result-box markdown-body">
              <ReactMarkdown>{translation}</ReactMarkdown>
            </div>
          </>
        )}

        {!translation && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: "var(--color-primary-soft)" }}>
              <Languages size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Ready to translate</p>
            <p className="ai-screen__unavailable-sub">Upload a PDF, choose a language, and tap Translate.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
