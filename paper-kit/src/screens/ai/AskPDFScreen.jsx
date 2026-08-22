/* AskPDFScreen — Chat-style Ask PDF interface */
import { useState, useRef, useEffect } from "react";
import { FileText, SendHorizonal, Upload, Bot } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Toast from "../../components/ui/Toast";
import { useToast } from "../../hooks/useToast";
import { useProcessing } from "../../context/ProcessingContext";
import "../ai/ai-screen.css";

export default function AskPDFScreen() {
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
  const { toast, dismissToast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessages([]);
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleAsk() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (!question.trim() || asking) return;
    const q = question.trim();
    setQuestion("");
    setAsking(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('ask-pdf', { file: inputVal, question: q });
      
      // Update selectedFile with server-resolved ID if it was uploaded during this request
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

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">PDF Document</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          id="ask-file-picker"
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
          id="ask-file-input"
        />
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Chat area */}
      <div className="ask-screen__chat">
        <div className="ask-screen__messages">
          {messages.length === 0 && !asking && (
            <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
              <div className="ai-screen__unavailable-icon" style={{ background: "var(--color-primary-soft)" }}>
                <Bot size={28} color="var(--color-primary)" />
              </div>
              <p className="ai-screen__unavailable-title">Ask anything about your PDF</p>
              <p className="ai-screen__unavailable-sub">Upload a PDF and type your question below. The AI will answer based on the document content.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`ask-screen__bubble ask-screen__bubble--${msg.role}`}
            >
              {msg.text}
            </div>
          ))}
          {asking && (
            <div className="ask-screen__bubble ask-screen__bubble--ai ask-screen__bubble--loading">
              <span className="ask-screen__typing-dot" />
              <span className="ask-screen__typing-dot" />
              <span className="ask-screen__typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="ask-screen__input-bar">
          <textarea
            ref={textareaRef}
            className="ask-screen__input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "Ask a question about this PDF…" : "Type your question or choose PDF first…"}
            disabled={asking}
            rows={1}
            id="ask-question-input"
          />
          <button
            className="ask-screen__send-btn"
            onClick={handleAsk}
            disabled={asking}
            id="ask-send-btn"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
