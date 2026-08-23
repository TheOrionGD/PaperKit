/* SimilarityMatrixScreen — Multi-Document Semantic Similarity & Duplicate Detection (Features 10, 26 of gv) */
import { useState, useRef } from 'react';
import { FileText, Plus, X, AlertTriangle, PieChart } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { similarityMatrix } from '../../services/ai';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './ai-screen.css';

export default function SimilarityMatrixScreen() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [matrixResult, setMatrixResult] = useState(null);
  const [error, setError] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  function handleAddFiles(e) {
    const newFiles = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (newFiles.length === 0) return;
    setFiles(prev => [...prev, ...newFiles]);
    setMatrixResult(null);
    e.target.value = '';
  }

  function handleRemoveFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setMatrixResult(null);
  }

  async function handleAnalyze() {
    if (files.length < 2) {
      showToast('Add at least 2 PDF documents to compute similarity matrix', 'warning');
      return;
    }
    setRunning(true);
    setError(null);
    setMatrixResult(null);

    try {
      // 1. Upload all files
      const uploaded = await Promise.all(files.map(f => uploadFile(f)));
      const fileIds = uploaded.map(u => u._id || u.id);

      // 2. Compute similarity matrix
      const result = await similarityMatrix(fileIds);
      setMatrixResult(result);
      showToast('Similarity analysis completed!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to compute similarity matrix.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="ai-screen">
      {/* File List */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Documents to Compare ({files.length}/5)</span>
          {files.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} /> Add PDF
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleAddFiles}
          id="similarity-file-input"
        />

        {files.length === 0 ? (
          <button
            className="ai-screen__file-picker"
            onClick={() => fileInputRef.current?.click()}
            id="similarity-pick-btn"
          >
            <FileText size={20} className="ai-screen__file-icon" />
            <span className="ai-screen__file-placeholder">Select 2 or more PDF documents to analyze…</span>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {files.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-divider)',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '11px', width: '20px' }}>
                    #{idx + 1}
                  </span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={16} color="var(--color-text-muted)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleAnalyze}
          disabled={running || files.length < 2}
          id="similarity-submit-btn"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}
        >
          {running ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Calculating Pairwise Semantic Similarity…
            </>
          ) : (
            <>
              <PieChart size={18} />
              Compute Similarity Score & Duplicate Matrix
            </>
          )}
        </button>
      </div>

      {error && <div className="ai-screen__error">{error}</div>}

      {/* Results */}
      {matrixResult && !running && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Duplicate Warnings */}
          {matrixResult.duplicates && matrixResult.duplicates.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#EF4444" />
              <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                High similarity detected! One or more documents may be duplicates or near-duplicates.
              </div>
            </div>
          )}

          {/* Matrix Pairs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(matrixResult.matrix || []).map((item, i) => {
              const score = item.similarity_score || 70;
              const isHigh = score >= 85;
              const isMed = score >= 60;
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--color-surface)',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-divider)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>
                      Doc Pair: {item.doc_a_id?.slice(-4) || 'A'} ↔ {item.doc_b_id?.slice(-4) || 'B'}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      color: isHigh ? '#10B981' : isMed ? '#F59E0B' : '#EF4444'
                    }}>
                      {score}% ({item.category || (isHigh ? 'Highly Similar' : isMed ? 'Similar' : 'Different')})
                    </span>
                  </div>

                  <div style={{ height: '6px', background: 'var(--color-divider)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{
                      height: '100%',
                      width: `${score}%`,
                      background: isHigh ? '#10B981' : isMed ? '#F59E0B' : '#EF4444',
                    }} />
                  </div>

                  {item.common_topics && item.common_topics.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Common Topics: {item.common_topics.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!matrixResult && !running && !error && (
        <div className="ai-screen__unavailable" style={{ opacity: 0.45 }}>
          <div className="ai-screen__unavailable-icon" style={{ background: 'var(--color-primary-soft)' }}>
            <PieChart size={28} color="var(--color-primary)" />
          </div>
          <p className="ai-screen__unavailable-title">Duplicate & Similarity Matrix</p>
          <p className="ai-screen__unavailable-sub">Compare multiple documents simultaneously to identify overlapping research, assignments, or contracts.</p>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
