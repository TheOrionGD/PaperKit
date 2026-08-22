import { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import './FilePreviewModal.css';

export default function FilePreviewModal({ isOpen, onClose, fileUrl, fileName, mimeType }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);

  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName || '');
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName || '');

  useEffect(() => {
    if (!isOpen || !fileUrl) return;
    setLoading(true);
    setError(null);
    setPdfPages([]);

    if (isPdf) {
      (async () => {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

          let loadingTask;
          if (typeof fileUrl === 'string') {
            loadingTask = pdfjsLib.getDocument({ url: fileUrl });
          } else if (fileUrl instanceof File || fileUrl instanceof Blob) {
            const arrayBuffer = await fileUrl.arrayBuffer();
            loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          } else if (fileUrl && (fileUrl.data || fileUrl.url)) {
            loadingTask = pdfjsLib.getDocument(fileUrl);
          } else {
            throw new Error('Invalid PDF source');
          }
          const pdf = await loadingTask.promise;
          const pages = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            pages.push(canvas.toDataURL('image/jpeg', 0.85));
          }
          setPdfPages(pages);
        } catch (err) {
          console.error('Failed to render PDF preview:', err);
          setError('Failed to render PDF preview.');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [isOpen, fileUrl, isPdf]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="preview-modal__backdrop" onClick={onClose}>
      <div className="preview-modal__container" onClick={e => e.stopPropagation()}>
        <div className="preview-modal__header">
          <div className="preview-modal__title-box">
            <FileText size={20} color="var(--color-primary)" />
            <span className="preview-modal__title">{fileName || 'Document Preview'}</span>
          </div>
          <div className="preview-modal__actions">
            <button className="btn-secondary btn-sm" onClick={handleDownload}>
              <Download size={16} />
              <span>Download</span>
            </button>
            <button className="preview-modal__close-btn" onClick={onClose} aria-label="Close preview">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="preview-modal__body">
          {loading && (
            <div className="preview-modal__loading">
              <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
              <p>Loading document preview...</p>
            </div>
          )}

          {error && (
            <div className="preview-modal__error">
              <p>{error}</p>
              <button className="btn-primary" onClick={handleDownload}>Download File Instead</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {isImage && (
                <div className="preview-modal__image-wrap">
                  <img src={fileUrl} alt={fileName} />
                </div>
              )}

              {isPdf && pdfPages.length > 0 && (
                <div className="preview-modal__pdf-list">
                  {pdfPages.map((pageUrl, idx) => (
                    <div key={idx} className="preview-modal__pdf-page">
                      <img src={pageUrl} alt={`Page ${idx + 1}`} />
                      <span className="preview-modal__page-num">Page {idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {!isImage && (!isPdf || pdfPages.length === 0) && (
                <div className="preview-modal__fallback">
                  <iframe src={fileUrl} title={fileName} className="preview-modal__iframe" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
