/* WatermarkScreen — add a text watermark overlay to a PDF */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import './WatermarkScreen.css';

export default function WatermarkScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [text, setText] = useState('CONFIDENTIAL');
  const [rotation, setRotation] = useState(45);
  const [opacity, setOpacity] = useState(0.3);
  const [watermarking, setWatermarking] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  async function getPdfPageCount(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Error reading PDF pages:', err);
      return 0;
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setTotalPages(0);
    try {
      const pageCount = await getPdfPageCount(file);
      setTotalPages(pageCount);
    } catch (err) {
      showToast('Reading file failed: ' + err.message, 'error');
    }
  }

  async function handleWatermark() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (!text.trim()) {
      showToast('Watermark text cannot be empty', 'warning');
      return;
    }

    setWatermarking(true);
    try {
      const result = await runProcessing('watermark', { file: selectedFile, text, rotation, opacity });
      
      if (result.download_url) {
        const url = result.download_url.startsWith('http') || result.download_url.startsWith('blob:')
          ? result.download_url
          : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${result.download_url}`;
        window.open(url, '_blank');
      }
      navigate('/files', { replace: true });
    } catch (err) {
      showToast(err.message || 'Watermark operation failed', 'error');
    } finally {
      setWatermarking(false);
    }
  }

  return (
    <div className="watermark-screen">
      <div className="watermark-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button 
            className="compress-screen__pick-btn" 
            onClick={() => fileInputRef.current?.click()} 
            id="watermark-pick-file-btn"
          >
            <div className="compress-screen__pick-icon" style={{ width: 48, height: 48, background: '#DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="compress-screen__pick-label">Choose PDF File</p>
            <p className="compress-screen__pick-sub">Tap to select a PDF to watermark</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {totalPages ? `${totalPages} pages` : 'Ready'}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="watermark-file-input"
        />

        {/* Options */}
        {selectedFile && (
          <div className="watermark-screen__options">
            <div className="watermark-screen__option">
              <label className="auth-screen__label" htmlFor="watermark-text-input">
                Watermark Text
              </label>
              <input
                id="watermark-text-input"
                className="watermark-screen__input"
                type="text"
                placeholder="CONFIDENTIAL, DRAFT, etc."
                value={text}
                onChange={e => setText(e.target.value)}
              />
            </div>

            <div className="watermark-screen__option">
              <label className="auth-screen__label" htmlFor="watermark-rotation-slider">
                Rotation Angle
              </label>
              <div className="watermark-screen__slider-container">
                <input
                  id="watermark-rotation-slider"
                  className="watermark-screen__slider"
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value, 10))}
                />
                <span className="watermark-screen__slider-val">{rotation}°</span>
              </div>
            </div>

            <div className="watermark-screen__option">
              <label className="auth-screen__label" htmlFor="watermark-opacity-slider">
                Opacity
              </label>
              <div className="watermark-screen__slider-container">
                <input
                  id="watermark-opacity-slider"
                  className="watermark-screen__slider"
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={opacity}
                  onChange={e => setOpacity(parseFloat(e.target.value))}
                />
                <span className="watermark-screen__slider-val">{Math.round(opacity * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleWatermark}
          loading={watermarking}
          disabled={watermarking}
          id="watermark-submit-btn"
        >
          {selectedFile ? 'WATERMARK PDF' : 'SELECT PDF FOR WATERMARK'}
        </PrimaryButton>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
