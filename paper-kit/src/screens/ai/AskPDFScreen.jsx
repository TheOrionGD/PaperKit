/* AskPDFScreen — Conversational RAG with Citations, Suggested Questions & Smart Workflow */
import { useState, useRef, useEffect } from "react";
import { FileText, SendHorizonal, Upload, Bot, Sparkles, Download, Search, Scale } from "lucide-react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import { useProcessing } from "../../context/ProcessingContext";
import "../ai/ai-screen.css";

const SUGGESTED_QUESTIONS = [
  "What is this document about?",
  "What is the deadline?",
  "Who is the author?",
  "What are the main requirements?",
  "Summarize Chapter 3.",
  "What are the important points?",
];

export default function AskPDFScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get("file_id");
  const filenameParam = searchParams.get("filename");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(() => {
    if (fileIdParam) {
      return { id: fileIdParam, name: filenameParam || "Selected Document.pdf" };
    }
    return null;
  });
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      showToast(`Loaded ${fileObj.name || 'document'} for AI Q&A`, 'info');
    }
  }, [location.state, showToast]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessages([]);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleAsk(promptText) {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    const q = (promptText || question).trim();
    if (!q || asking) return;
    setQuestion("");
    setAsking(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('ask-pdf', { file: inputVal, question: q });
      
      if (res._fileParams?.file && !selectedFile.id) {
        setSelectedFile(prev => ({
          ...prev,
          id: res._fileParams.file
        }));
      }

      setMessages((prev) => [...prev, { role: "ai", text: res.answer }]);
    } catch (err) {
      const msg = err.message?.toLowerCase().includes("api key") || err.status === 503
        ? "AI service is unavailable. Please check server configuration."
        : err.message || "Failed to get answer.";
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ " + msg, error: true }]);
    } finally {
      setAsking(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleDownloadChatReport() {
    if (messages.length === 0) return;
    const transcript = `# PaperKit AI Document Chat Report
Document: ${selectedFile?.name || 'Document.pdf'}
Timestamp: ${new Date().toLocaleString()}

---

${messages.map(m => `### ${m.role === 'user' ? 'USER QUESTION' : 'AI ANSWER'}\n${m.text}\n`).join('\n---\n\n')}
`;
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name?.replace(/\.[^/.]+$/, "") || "document"}_chat_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderMessageContent(text) {
    if (!text) return null;
    const parts = text.split(/(\[Page\s+\d+(?:[^\]]*)\])/gi);
    return parts.map((part, idx) => {
      if (/^\[Page\s+\d+/i.test(part)) {
        return (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              margin: '0 3px',
              border: '1px solid var(--color-divider)',
              verticalAlign: 'baseline',
            }}
          >
            📄 {part.replace(/[[\]]/g, '')}
          </span>
        );
      }
      return part;
    });
  }

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Document for AI Chat</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          id="ask-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select PDF document to ask questions…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
          id="ask-file-input"
        />
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Suggested Questions Chips */}
      {selectedFile && messages.length === 0 && (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
            Suggested Questions:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUESTIONS.map((qText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(qText)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-divider)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {qText}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="ask-screen__chat" style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-divider)', marginBottom: '14px' }}>
        <div className="ask-screen__messages" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && !asking && (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              <Bot size={32} color="var(--color-primary)" style={{ margin: '0 auto 8px', display: 'block' }} />
              Ask any question about your document — PaperKit provides grounded answers with exact page citations.
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: m.role === 'user' ? '#ffffff' : 'var(--color-text)',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  border: m.role === 'user' ? 'none' : '1px solid var(--color-divider)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {renderMessageContent(m.text)}
              </div>
            </div>
          ))}

          {asking && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '6px' }}>
              <span className="ai-screen__submit-spinner" />
              <span>Analyzing context & searching pages…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input
          ref={textareaRef}
          type="text"
          placeholder={selectedFile ? "Ask a question about this document..." : "Select document first..."}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={asking || !selectedFile}
          style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          id="ask-question-input"
        />
        <button
          type="button"
          onClick={() => handleAsk()}
          disabled={asking || !selectedFile || !question.trim()}
          style={{ padding: '0 16px', borderRadius: '12px', background: 'var(--color-primary)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          id="ask-submit-btn"
        >
          <SendHorizonal size={18} />
        </button>
      </div>

      {/* ⭐ Smart Workflow Chaining options after receiving answer matching spec:
          Options: Ask Another Question | Summarize Document | Search Document | Compare Document | Download Report | Exit */}
      {messages.length > 0 && (
        <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--color-primary)" /> What would you like to do next?
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownloadChatReport}
              className="common-result__action-card"
            >
              <div className="common-result__action-icon">
                <Download size={16} />
              </div>
              <p className="common-result__action-label">Download Report</p>
              <p className="common-result__action-desc">Save Q&A transcript</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/ai/summarize', { state: { chainedFile: selectedFile } })}
              className="common-result__action-card"
            >
              <div className="common-result__action-icon">
                <FileText size={16} />
              </div>
              <p className="common-result__action-label">Summarize Doc</p>
              <p className="common-result__action-desc">Generate executive summary</p>
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
              <p className="common-result__action-desc">Semantic intent search</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/ai/compare', { state: { chainedFile: selectedFile } })}
              className="common-result__action-card"
            >
              <div className="common-result__action-icon">
                <Scale size={16} />
              </div>
              <p className="common-result__action-label">Compare Doc</p>
              <p className="common-result__action-desc">Semantic comparison</p>
            </button>
          </div>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
