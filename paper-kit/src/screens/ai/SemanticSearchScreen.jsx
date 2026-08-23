/* SemanticSearchScreen — Search document content by conceptual meaning (Feature 13 of gv) */
import { useState, useRef } from 'react';
import { Search, Sparkles, FileText, Upload, CornerDownRight } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { semanticSearch } from '../../services/ai';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

const SAMPLE_QUERIES = [
  'Employee salary & compensation',
  'Project deadlines & delivery milestones',
  'Termination & liability clauses',
  'Budget allocation & expenses',
  'Methodology & experimental setup',
];

export default function SemanticSearchScreen() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSearchResults(null);
    e.target.value = '';
  }

  async function handleSearch(searchQuery) {
    const q = searchQuery || query;
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (!q.trim()) {
      showToast('Please enter a semantic search term or concept', 'warning');
      return;
    }

    setRunning(true);
    setError(null);
    setSearchResults(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;
      const result = await semanticSearch(fileId, q);
      setSearchResults(result);
    } catch (err) {
      setError(err.message || 'Semantic search failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="ai-screen">
      {/* File picker */}
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">PDF Document</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? ' ai-screen__file-picker--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          id="search-file-picker"
        >
          <FileText size={20} className="ai-screen__file-icon" color="var(--color-primary)" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name}</span>
          ) : (
            <span className="ai-screen__file-placeholder">Select a PDF to search by meaning…</span>
          )}
          <Upload size={16} color="var(--color-text-muted)" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="search-file-input"
        />
      </div>

      {/* Search Input Box */}
      <div style={{ marginTop: '12px', marginBottom: '8px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          What concept or topic are you looking for?
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="e.g. employee salary, termination clauses, deadlines..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--color-divider)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '13px'
              }}
              id="semantic-search-input"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={running}
            style={{
              padding: '0 16px',
              borderRadius: '10px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="semantic-search-btn"
          >
            <Sparkles size={15} /> Search
          </button>
        </div>
      </div>

      {/* Suggested Query Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '14px' }}>
        {SAMPLE_QUERIES.map((sq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setQuery(sq); handleSearch(sq); }}
            style={{
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '11px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {sq}
          </button>
        ))}
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results list */}
      <div className="ai-screen__result">
        {running && (
          <div className="ai-screen__loading">
            <div className="ai-screen__loading-orb">
              <Search size={26} color="#fff" />
            </div>
            <p className="ai-screen__loading-text">Semantic search in progress…</p>
            <p className="ai-screen__loading-sub">Looking for conceptual synonyms and contextual sections</p>
          </div>
        )}

        {searchResults && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Found {(searchResults.results || []).length} relevant conceptual sections for "{searchResults.query}":
            </div>

            {(searchResults.results || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: 'var(--color-surface)', borderRadius: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                No semantic matches found for this query. Try a broader concept.
              </div>
            ) : (
              searchResults.results.map((res, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--color-surface)',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-divider)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                      {res.matched_concept || 'Matching Concept'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: (res.relevance_score || 80) >= 85 ? '#10B981' : '#F59E0B',
                      background: 'var(--color-primary-soft)',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      {res.relevance_score || 85}% Match
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', lineHeight: 1.5, background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', fontStyle: 'italic', marginBottom: '8px' }}>
                    "{res.snippet}"
                  </p>

                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CornerDownRight size={13} color="var(--color-text-muted)" />
                    <span><strong>Why it matched:</strong> {res.explanation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!searchResults && !running && !error && (
          <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
            <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
              <Search size={28} color="var(--color-primary)" />
            </div>
            <p className="ai-screen__unavailable-title">Search by Meaning, Not Just Keywords</p>
            <p className="ai-screen__unavailable-sub">PaperKit understands synonyms, intent, and concepts across your document.</p>
          </div>
        )}
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
