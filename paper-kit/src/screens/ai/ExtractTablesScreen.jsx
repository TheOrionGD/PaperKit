/* ExtractTablesScreen — AI-powered table extraction from PDF */
import { useState, useRef } from "react";
import { FileText, TableProperties, Copy, Download, Upload, Check } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import { useProcessing } from "../../context/ProcessingContext";
import "../ai/ai-screen.css";

/* Very lightweight markdown table → HTML renderer */
function MarkdownTables({ raw }) {
  if (!raw) return null;
  // Split on blank lines to find table blocks
  const lines = raw.split("\n");
  const html = [];
  let inTable = false;
  let tableLines = [];

  function flushTable() {
    if (tableLines.length === 0) return;
    const rows = tableLines.filter((l) => l.trim().startsWith("|") && !l.match(/^\|[\s\-:|]+\|/));
    html.push(
      <div key={html.length} style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {rows.map((row, ri) => {
              const cells = row.split("|").filter((_, ci, arr) => ci > 0 && ci < arr.length - 1);
              const Tag = ri === 0 ? "th" : "td";
              return (
                <tr key={ri}>
                  {cells.map((cell, ci) => (
                    <Tag
                      key={ci}
                      style={{
                        border: "1px solid var(--color-divider)",
                        padding: "6px 10px",
                        background: ri === 0 ? "var(--color-primary-soft)" : "transparent",
                        color: ri === 0 ? "var(--color-primary)" : "var(--color-text-primary)",
                        fontWeight: ri === 0 ? 700 : 400,
                      }}
                    >
                      {cell.trim()}
                    </Tag>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      if (line.trim()) {
        html.push(<p key={html.length} style={{ margin: "6px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>{line}</p>);
      }
    }
  }
  if (inTable) flushTable();

  return <>{html}</>;
}

export default function ExtractTablesScreen() {
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
  const [running, setRunning] = useState(false);
  const [tables, setTables] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, dismissToast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setTables(null);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleExtract() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setRunning(true);
    setError(null);
    setTables(null);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('extract-tables', { file: inputVal });
      setTables(res.tables);
    } catch (err) {
      if (err.status === 503 || err.message?.toLowerCase().includes("api key") || err.message?.toLowerCase().includes("gemini")) {
        setError("AI service is currently unavailable. Please check the server configuration.");
      } else {
        setError(err.message || "Extraction failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    if (!tables) return;
    navigator.clipboard.writeText(tables).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!tables) return;
    const blob = new Blob([tables], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tables.md";
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
          id="tables-file-picker"
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
          id="tables-file-input"
        />
      </div>

      {/* Submit */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleExtract}
          disabled={running}
          id="tables-submit-btn"
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Extracting tables…
            </>
          ) : (
            <>
              <TableProperties size={17} />
              {selectedFile ? 'Extract Tables' : 'Select PDF to Extract Tables'}
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
              <TableProperties size={24} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Detecting and extracting tables…</p>
            <p className="ai-screen__loading-sub">AI is scanning the document for structured data</p>
          </div>
        )}

        {tables && !running && (
          <>
            <div className="ai-screen__result-header">
              <span className="ai-screen__result-title">Extracted Tables</span>
              <div className="ai-screen__result-actions">
                <button
                  className={`ai-screen__result-action-btn${copied ? " ai-screen__result-action-btn--primary" : ""}`}
                  onClick={handleCopy}
                  id="tables-copy-btn"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy MD"}
                </button>
                <button
                  className="ai-screen__result-action-btn"
                  onClick={handleDownload}
                  id="tables-download-btn"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </div>
            <div className="ai-screen__result-box" style={{ padding: 16 }}>
              <MarkdownTables raw={tables} />
            </div>
          </>
        )}

        {!tables && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: "var(--color-primary-soft)" }}>
              <TableProperties size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Extract tables from PDF</p>
            <p className="ai-screen__unavailable-sub">AI will detect and extract all tabular data from your PDF document.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
