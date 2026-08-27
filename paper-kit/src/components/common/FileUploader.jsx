import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { FileTypeIcon } from '../icons/ToolIcons';
import './FileUploader.css';

export default function FileUploader({
  accept,
  onFileSelect,
  title = 'Select Document',
  subtitle = 'Choose a file or drag & drop it here',
  icon = 'pdf'
}) {
  const inputRef   = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  return (
    <div
      className={`file-uploader-box${dragging ? ' drag-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragOver}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {/* Drag-over overlay hint */}
      <div className="file-uploader-box__drag-hint">
        Drop file here ↓
      </div>

      <div className="file-uploader-box__icon-wrapper">
        {icon
          ? <FileTypeIcon type={icon} size={40} />
          : <Upload size={36} color="var(--color-primary)" />
        }
      </div>

      <h3 className="file-uploader-box__title">{title}</h3>
      <p className="file-uploader-box__subtitle">{subtitle}</p>

      <button
        type="button"
        className="file-uploader-box__btn"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <Upload size={15} />
        <span>Browse Files</span>
      </button>
    </div>
  );
}

