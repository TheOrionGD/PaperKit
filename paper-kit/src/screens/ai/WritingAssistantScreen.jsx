/* WritingAssistantScreen — AI Writing Assistance & Polishing (Feature 17 of gv) */
import { useState, useRef } from 'react';
import { PenTool, Sparkles, Copy, Check, Upload } from 'lucide-react';
import { writingAssistant } from '../../services/ai';
import { uploadFile } from '../../services/files';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import ReactMarkdown from 'react-markdown';
import './ai-screen.css';

const TASKS = [
  { id: 'grammar_spelling',     label: 'Grammar & Spelling',  desc: 'Fix typos & syntax errors' },
  { id: 'sentence_improvement', label: 'Sentence Flow',       desc: 'Elevate tone & vocabulary' },
  { id: 'paraphrase',           label: 'Paraphrase',          desc: 'Reword with fresh phrasing' },
  { id: 'formal',               label: 'Academic / Formal',   desc: 'Professional executive tone' },
  { id: 'simplify',             label: 'Simplify Language',   desc: 'Clear & concise prose' },
  { id: 'expand',               label: 'Expand Details',      desc: 'Elaborate with context' },
];

export default function WritingAssistantScreen() {
  const fileInputRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [task, setTask] = useState('grammar_spelling');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRunning(true);
    setError(null);
    try {
      const uploadRes = await uploadFile(file);
      const res = await writingAssistant(null, task, null, uploadRes._id || uploadRes.id);
      setResult(res);
      if (res.original_text) setInputText(res.original_text);
    } catch (err) {
      setError(err.message || 'Failed to process document.');
    } finally {
      setRunning(false);
    }
  }

  async function handleEnhance() {
    if (!inputText.trim()) {
      showToast('Please type or paste text to improve', 'warning');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await writingAssistant(inputText, task);
      setResult(res);
      showToast('Text polished successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Writing assistance failed.');
    } finally {
      setRunning(false);
    }
  }

  function handleCopy() {
    if (!result?.improved_text) return;
    navigator.clipboard.writeText(result.improved_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="ai-screen">
      {/* Input area */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Original Draft or Text to Improve</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Upload size={13} /> Or Import from PDF
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <textarea
          rows={5}
          placeholder="Paste paragraphs or sentences here (e.g. The project is very good and gives many benefits)..."
          value={inputText}
          onChange={e => { setInputText(e.target.value); setResult(null); }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--color-divider)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '13px',
            lineHeight: 1.5,
            resize: 'vertical'
          }}
          id="writing-assist-textarea"
        />
      </div>

      {/* Task selector */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Writing Style / Task</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {TASKS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTask(t.id); setResult(null); }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: task === t.id ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: task === t.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: task === t.id ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '12px' }}>{t.label}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleEnhance}
          disabled={running || !inputText.trim()}
          id="writing-assist-submit-btn"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Polishing & Enhancing Writing…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Enhance Writing with AI
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb" style={{ background: '#10B981' }}>
              <PenTool size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Polishing sentences & vocabulary…</p>
            <p className="ai-screen__loading-sub">Adjusting phrasing, clarity, and tone</p>
          </div>
        )}

        {result && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="ai-screen__result-header">
              <span className="ai-screen__result-title">Improved Version</span>
              <div className="ai-screen__result-actions">
                <button
                  className={`ai-screen__result-action-btn${copied ? ' ai-screen__result-action-btn--primary' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="markdown-body" style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-divider)' }}>
              <ReactMarkdown>{result.improved_text}</ReactMarkdown>
            </div>

            {/* Improvements Checklist */}
            {result.improvements && result.improvements.length > 0 && (
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>
                  What was improved:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {result.improvements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!result && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <PenTool size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">AI Writing Assistant</p>
            <p className="ai-screen__unavailable-sub">Paste drafts to correct grammar, formalize academic tone, paraphrase, or simplify complex paragraphs.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
