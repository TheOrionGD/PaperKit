import { MoreVertical } from 'lucide-react';
import { FileTypeIcon } from '../icons/ToolIcons';
import { formatFileTimestamp } from '../../utils/dateUtils';
import './components.css';

function getFileType(filename) {
  if (!filename) return 'default';
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    pdf: 'pdf',
    doc: 'word', docx: 'word', odt: 'word', rtf: 'word',
    xls: 'excel', xlsx: 'excel', ods: 'excel', csv: 'csv',
    ppt: 'ppt', pptx: 'ppt', odp: 'ppt',
    txt: 'txt', md: 'txt', log: 'txt',
    html: 'code', htm: 'code', css: 'code', js: 'code', jsx: 'code',
    ts: 'code', tsx: 'code', py: 'code', java: 'code', json: 'code',
    xml: 'code', yaml: 'code', yml: 'code', sh: 'code', sql: 'code',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
    webp: 'image', svg: 'image', heic: 'image', heif: 'image',
    bmp: 'image', tiff: 'image', tif: 'image', ico: 'image',
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
    webm: 'video', wmv: 'video', flv: 'video', m4v: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio',
    flac: 'audio', m4a: 'audio', wma: 'audio',
    zip: 'zip', rar: 'zip', tar: 'zip', gz: 'zip', '7z': 'zip', bz2: 'zip',
  };
  return map[ext] || 'default';
}


function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({ file, onMore, onClick }) {
  const type = getFileType(file.original_filename || file.filename);

  return (
    <div className="file-card" onClick={onClick} id={`file-card-${file._id || file.id}`}>
      {file.thumbnail_url ? (
        <img
          src={file.thumbnail_url}
          alt={file.original_filename || file.filename}
          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          className="file-card__thumbnail"
        />
      ) : (
        <FileTypeIcon type={type} size={40} />
      )}
      <div className="file-card__info">
        <div className="file-card__name">{file.original_filename || file.filename}</div>
        <div className="file-card__meta">
          {formatSize(file.size)}
          {file.page_count ? ` • ${file.page_count} pages` : ''}
          {(file.created_at || file.updated_at) ? ` • ${formatFileTimestamp(file.created_at || file.updated_at)}` : ''}
        </div>
      </div>
      <button
        className="file-card__more-btn"
        onClick={e => { e.stopPropagation(); onMore && onMore(file, e); }}
        aria-label={`More options for ${file.original_filename || file.filename}`}
        id={`file-card-more-${file._id || file.id}`}
      >
        <MoreVertical size={18} color="var(--color-text-muted)" />
      </button>
    </div>
  );
}
