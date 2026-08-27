/* ScannerScreen — full-screen dark camera UI matching the reference.
   Uses Capacitor Camera API for native iOS/Android. Falls back to getUserMedia on web. */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, ImageIcon, Crop } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { getStoredLocalFiles, saveStoredLocalFiles, uploadFile } from '../services/files';
import './ScannerScreen.css';

async function processScanClientSide(imageSrc, corners, mode, filename) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        
        let minX = 0, minY = 0, maxX = iw, maxY = ih;
        if (Array.isArray(corners) && corners.length === 4) {
          const xs = corners.map(c => (c.x || 0) * iw);
          const ys = corners.map(c => (c.y || 0) * ih);
          minX = Math.max(0, Math.min(...xs));
          minY = Math.max(0, Math.min(...ys));
          maxX = Math.min(iw, Math.max(...xs));
          maxY = Math.min(ih, Math.max(...ys));
        }

        const cropW = Math.max(120, maxX - minX);
        const cropH = Math.max(120, maxY - minY);

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');

        // Draw cropped region
        ctx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        // Enhance contrast for document / receipt readability
        if (mode === 'document' || mode === 'receipt') {
          const imgData = ctx.getImageData(0, 0, cropW, cropH);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const factor = 1.2;
            d[i] = Math.min(255, Math.max(0, (d[i] - 128) * factor + 128));
            d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * factor + 128));
            d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * factor + 128));
          }
          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob((blob) => {
          resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.92) });
        }, 'image/jpeg', 0.92);
      } catch (e) {
        resolve({ blob: null, dataUrl: imageSrc });
      }
    };
    img.onerror = () => resolve({ blob: null, dataUrl: imageSrc });
    img.src = imageSrc;
  });
}

const SCAN_TYPES = [
  { id: 'id-card', label: 'ID Card' },
  { id: 'document', label: 'Document' },
  { id: 'book', label: 'Book' },
  { id: 'receipt', label: 'Receipt' },
];

export default function ScannerScreen() {

  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  const [activeScanType, setActiveScanType] = useState('document');
  const [flashOn, setFlashOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  // Crop / perspective correction state
  const [cropMode, setCropMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // base64 string
  const [corners, setCorners] = useState([]); // [{x, y}]
  const [detectingEdges, setDetectingEdges] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(null);

  /* Start camera stream (web fallback) */
  const startCamera = useCallback(async () => {
    try {
      /* Try Capacitor first */
      if (window.Capacitor?.isNativePlatform?.()) {
        setCameraReady(true);
        return;
      }
      /* Web fallback: getUserMedia */
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(`Camera unavailable: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    if (!cropMode) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera, cropMode]);

  /* Detect edges call to backend */
  const detectEdges = async (base64) => {
    setDetectingEdges(true);
    try {
      const res = await api.post('/tools/detect-document', { image: base64 });
      if (res.data?.corners && res.data.corners.length === 4) {
        setCorners(res.data.corners);
      } else {
        throw new Error('Contour detection returned invalid format');
      }
    } catch (err) {
      console.warn('Backend edge detection failed, using fallback margins:', err);
      // Fallback relative coordinates (10% inset margin)
      setCorners([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 }
      ]);
    } finally {
      setDetectingEdges(false);
    }
  };

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);

    try {
      let base64 = '';
      if (window.Capacitor?.isNativePlatform?.()) {
        const { Camera } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'base64',
        });
        base64 = photo.base64String;
      } else {
        /* Web: capture from video stream */
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        if (!video) throw new Error('Video stream is not running');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      }

      // Stop camera feed to save CPU/battery
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      setCapturedImage(base64);
      setCropMode(true);
      await detectEdges(base64);

    } catch (err) {
      console.error('Capture error:', err);
      showToast('Capture failed: ' + err.message, 'error');
    } finally {
      setCapturing(false);
    }
  }

  async function handleGallery() {
    try {
      let base64 = '';
      if (window.Capacitor?.isNativePlatform?.()) {
        const { Camera, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'base64',
          source: CameraSource.Photos,
        });
        base64 = photo.base64String;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        setCapturedImage(base64);
        setCropMode(true);
        await detectEdges(base64);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async evt => {
            base64 = evt.target.result.split(',')[1];

            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }

            setCapturedImage(base64);
            setCropMode(true);
            await detectEdges(base64);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    } catch (err) {
      console.error('Gallery error:', err);
      showToast('Gallery load failed: ' + err.message, 'error');
    }
  }

  /* Draggable SVG points logic */
  const handlePointerDown = (index, e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setDraggingIndex(index);
  };

  const handlePointerMove = (e) => {
    if (draggingIndex === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Convert current client position to relative float [0, 1] bounded
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    setCorners(prev => {
      const next = [...prev];
      next[draggingIndex] = { x, y };
      return next;
    });
  };

  const handlePointerUp = () => {
    setDraggingIndex(null);
  };

  /* Send cropped document to backend for warping & enhance */
  const handleApplyScan = async () => {
    if (processingScan) return;
    setProcessingScan(true);

    try {
      const filename = `scan_${activeScanType}_${Date.now().toString().slice(-6)}.jpg`;
      
      // 1. Process document locally on client-side canvas
      const { blob, dataUrl } = await processScanClientSide(capturedImage, corners, activeScanType, filename);

      // 2. Try remote upload/process
      try {
        if (blob) {
          const fileObj = new File([blob], filename, { type: 'image/jpeg' });
          await uploadFile(fileObj);
        } else {
          await api.post('/tools/process-scan', {
            image: dataUrl,
            corners: corners,
            mode: activeScanType,
            filename: filename
          });
        }
      } catch (backendErr) {
        console.debug('Backend scan sync skipped, using local offline cache:', backendErr.message);
      }

      // 3. Guarantee local file cache entry so file is immediately in My Files
      const existing = getStoredLocalFiles();
      const newFileEntry = {
        _id: `scan_${Date.now()}`,
        id: `scan_${Date.now()}`,
        filename: filename,
        original_filename: filename,
        content_type: 'image/jpeg',
        mime_type: 'image/jpeg',
        size: blob?.size || Math.round(dataUrl.length * 0.75),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dataUrl: dataUrl,
      };
      saveStoredLocalFiles([newFileEntry, ...existing]);

      showToast('Document scanned and saved successfully!', 'success');
      
      setTimeout(() => {
        navigate('/files', { replace: true });
      }, 800);
    } catch (err) {
      console.error('Processing scan failed:', err);
      showToast(err.message || 'Processing failed', 'error');
    } finally {
      setProcessingScan(false);
    }
  };


    // ── Render Crop Overlay Mode ──────────────────────────────────────────────────
    if (cropMode) {
      return (
        <div className="scanner-screen scanner-screen--crop">
          {/* Header */}
          <div className="scanner-screen__header">
            <button
              className="scanner-screen__icon-btn"
              onClick={() => {
                setCropMode(false);
                setCapturedImage(null);
                setCorners([]);
              }}
              aria-label="Cancel crop"
              id="scanner-crop-back-btn"
            >
              <X size={22} color="white" />
            </button>
            <h1 className="scanner-screen__title">Adjust Borders</h1>
            <div style={{ width: 40 }} />
          </div>

          {/* Workspace area */}
          <div className="scanner-screen__crop-container">
            {detectingEdges && (
              <div className="scanner-screen__loading-overlay">
                <p>Detecting borders...</p>
              </div>
            )}

            <div
              ref={containerRef}
              className="scanner-screen__image-wrap"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img
                src={`data:image/jpeg;base64,${capturedImage}`}
                alt="Cropping scan"
                className="scanner-screen__preview-image"
                draggable="false"
              />

              {!detectingEdges && corners.length === 4 && (
                <svg
                  className="scanner-screen__svg-overlay"
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                >
                  {/* Connect handles */}
                  <polygon
                    points={corners.map(c => `${c.x * 1000},${c.y * 1000}`).join(' ')}
                    fill="rgba(37, 99, 235, 0.15)"
                    stroke="var(--color-primary)"
                    strokeWidth="6"
                  />

                  {/* 4 Corner circles */}
                  {corners.map((c, idx) => (
                    <circle
                      key={idx}
                      cx={c.x * 1000}
                      cy={c.y * 1000}
                      r="25"
                      fill="var(--color-primary)"
                      stroke="white"
                      strokeWidth="6"
                      onPointerDown={e => handlePointerDown(idx, e)}
                      style={{ cursor: 'pointer', touchAction: 'none' }}
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>

          {/* Mode selector */}
          <div className="scanner-screen__type-row">
            {SCAN_TYPES.map(type => (
              <button
                key={type.id}
                className={`scanner-screen__type-tab ${activeScanType === type.id ? 'scanner-screen__type-tab--active' : ''}`}
                onClick={() => setActiveScanType(type.id)}
                id={`scanner-crop-type-${type.id}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Crop Controls */}
          <div className="scanner-screen__controls scanner-screen__controls--crop">
            <button
              className="scanner-screen__btn scanner-screen__btn--secondary"
              onClick={() => {
                setCropMode(false);
                setCapturedImage(null);
                setCorners([]);
              }}
              disabled={processingScan}
              id="scanner-crop-retake-btn"
            >
              Retake
            </button>

            <button
              className="scanner-screen__btn scanner-screen__btn--primary"
              onClick={handleApplyScan}
              disabled={processingScan || detectingEdges}
              id="scanner-crop-save-btn"
            >
              {processingScan ? 'Enhancing Scan...' : 'Save Scan'}
            </button>
          </div>

          <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
        </div>
      );
    }

    // ── Render Camera Preview Mode ────────────────────────────────────────────────
    return (
      <div className="scanner-screen">
        {/* Header */}
        <div className="scanner-screen__header">
          <button
            className="scanner-screen__icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Close scanner"
            id="scanner-close-btn"
          >
            <X size={22} color="white" />
          </button>
          <h1 className="scanner-screen__title">Smart Scanner</h1>
          <button
            className="scanner-screen__icon-btn"
            onClick={() => setFlashOn(v => !v)}
            aria-label="Toggle flash"
            id="scanner-flash-btn"
          >
            <Zap size={22} color={flashOn ? '#F59E0B' : 'white'} fill={flashOn ? '#F59E0B' : 'none'} />
          </button>
        </div>

        {/* Camera stream view */}
        <div className="scanner-screen__camera">
          {cameraError ? (
            <div className="scanner-screen__error">
              <p>{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="scanner-screen__video"
                autoPlay
                playsInline
                muted
              />

              {/* In-view guidelines overlay */}
              {cameraReady && (
                <div className="scanner-screen__overlay" aria-hidden="true">
                  <div className="scanner-screen__crop-box">
                    <div className="scanner-screen__corner scanner-screen__corner--tl" />
                    <div className="scanner-screen__corner scanner-screen__corner--tr" />
                    <div className="scanner-screen__corner scanner-screen__corner--bl" />
                    <div className="scanner-screen__corner scanner-screen__corner--br" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mode selection row */}
        <div className="scanner-screen__type-row">
          {SCAN_TYPES.map(type => (
            <button
              key={type.id}
              className={`scanner-screen__type-tab ${activeScanType === type.id ? 'scanner-screen__type-tab--active' : ''}`}
              onClick={() => setActiveScanType(type.id)}
              id={`scanner-type-${type.id}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Bottom bar capture / library */}
        <div className="scanner-screen__controls">
          <button
            className="scanner-screen__ctrl-btn"
            onClick={handleGallery}
            aria-label="Open gallery"
            id="scanner-gallery-btn"
          >
            <ImageIcon size={24} color="white" />
            <span>Gallery</span>
          </button>

          <button
            className={`scanner-screen__capture-btn ${capturing ? 'scanner-screen__capture-btn--capturing' : ''}`}
            onClick={handleCapture}
            disabled={capturing || !!cameraError}
            aria-label="Capture"
            id="scanner-capture-btn"
          >
            <div className="scanner-screen__capture-inner" />
          </button>

          <button
            className="scanner-screen__ctrl-btn"
            onClick={() => {
              // Auto crop acts as guide helper: notifies user guidelines are active
              showToast('Place document within guidelines for auto edge detection.', 'default');
            }}
            aria-label="Auto crop explanation"
            id="scanner-autocrop-btn"
          >
            <Crop size={24} color="white" />
            <span>Auto Guide</span>
          </button>
        </div>

        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }
