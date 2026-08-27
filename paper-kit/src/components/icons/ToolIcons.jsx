/* eslint-disable react-refresh/only-export-components */
/* ToolIcons.jsx — SVG icon components for all PaperKit tools.
   Each icon uses a colored rounded-square background with a white pictogram.
   Colors come from design tokens. */
import { Archive, FolderArchive, FileArchive } from 'lucide-react';


/* Generic icon wrapper with colored bg */
export function ToolIconWrapper({ bgColor, softColor, size = 44, children }) {
  return (
    <div
      className="tool-icon-box"
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${softColor} 0%, rgba(255,255,255,0.4) 100%)`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), inset 0 2px 4px rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255,255,255,0.9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06), inset 0 2px 4px rgba(255,255,255,0.8)';
      }}
    >
      <div style={{ color: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
        {children}
      </div>
    </div>
  );
}


/* File type icons for file cards — rich SVG pictograms for every format */
export function getFileType(filename) {
  if (!filename) return 'default';
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    // Documents
    pdf: 'pdf',
    doc: 'word', docx: 'word', odt: 'word', rtf: 'word',
    xls: 'excel', xlsx: 'excel', ods: 'excel', csv: 'csv',
    ppt: 'ppt', pptx: 'ppt', odp: 'ppt',
    txt: 'txt', md: 'txt', log: 'txt',
    // Code / data
    html: 'code', htm: 'code', css: 'code', js: 'code', jsx: 'code',
    ts: 'code', tsx: 'code', py: 'code', java: 'code', json: 'code',
    xml: 'code', yaml: 'code', yml: 'code', sh: 'code', sql: 'code',
    // Images
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
    webp: 'image', svg: 'image', heic: 'image', heif: 'image',
    bmp: 'image', tiff: 'image', tif: 'image', ico: 'image',
    // Video
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
    webm: 'video', wmv: 'video', flv: 'video', m4v: 'video',
    // Audio
    mp3: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio',
    flac: 'audio', m4a: 'audio', wma: 'audio',
    // Archives
    zip: 'zip', rar: 'zip', tar: 'zip', gz: 'zip',
    '7z': 'zip', bz2: 'zip',
  };
  return map[ext] || 'default';
}

export function FileTypeIcon({ type, size = 36 }) {
  const t = type?.toLowerCase() || 'default';

  const THEMES = {
    pdf:     { bg: 'linear-gradient(135deg,#FEE2E2 0%,#FCA5A5 100%)',  fg: '#DC2626', shadow: 'rgba(239,68,68,0.22)' },
    word:    { bg: 'linear-gradient(135deg,#DBEAFE 0%,#93C5FD 100%)',  fg: '#2563EB', shadow: 'rgba(59,130,246,0.22)' },
    excel:   { bg: 'linear-gradient(135deg,#D1FAE5 0%,#6EE7B7 100%)',  fg: '#059669', shadow: 'rgba(16,185,129,0.22)' },
    csv:     { bg: 'linear-gradient(135deg,#D1FAE5 0%,#6EE7B7 100%)',  fg: '#059669', shadow: 'rgba(16,185,129,0.22)' },
    ppt:     { bg: 'linear-gradient(135deg,#FEF3C7 0%,#FCD34D 100%)',  fg: '#D97706', shadow: 'rgba(245,158,11,0.22)' },
    image:   { bg: 'linear-gradient(135deg,#EDE9FE 0%,#C4B5FD 100%)',  fg: '#7C3AED', shadow: 'rgba(139,92,246,0.22)' },
    video:   { bg: 'linear-gradient(135deg,#FCE7F3 0%,#F9A8D4 100%)',  fg: '#DB2777', shadow: 'rgba(219,39,119,0.22)' },
    audio:   { bg: 'linear-gradient(135deg,#FDF4FF 0%,#E879F9 100%)',  fg: '#A21CAF', shadow: 'rgba(162,28,175,0.22)' },
    txt:     { bg: 'linear-gradient(135deg,#F1F5F9 0%,#CBD5E1 100%)',  fg: '#475569', shadow: 'rgba(71,85,105,0.22)'  },
    code:    { bg: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)',  fg: '#38BDF8', shadow: 'rgba(56,189,248,0.22)' },
    zip:     { bg: 'linear-gradient(135deg,#FFF7ED 0%,#FED7AA 100%)',  fg: '#EA580C', shadow: 'rgba(234,88,12,0.22)'  },
    default: { bg: 'linear-gradient(135deg,#F3F4F6 0%,#D1D5DB 100%)',  fg: '#4B5563', shadow: 'rgba(107,114,128,0.22)'},
  };

  const theme = THEMES[t] || THEMES.default;
  const s = Math.round(size * 0.44); // inner icon stroke size

  /* SVG pictogram per type */
  const icons = {
    pdf: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
        <line x1="8" y1="9" x2="10" y2="9"/>
      </g>
    ),
    word: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="13" y2="17"/>
        <path d="M8 10l2 4 2-4 2 4 2-4" strokeWidth="1.4"/>
      </g>
    ),
    excel: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="8" y1="15" x2="16" y2="15"/>
        <line x1="8" y1="18" x2="16" y2="18"/>
        <line x1="12" y1="12" x2="12" y2="18"/>
      </g>
    ),
    csv: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <path d="M9 13h-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1" strokeWidth="1.4"/>
        <polyline points="12 13 14 17 16 13" strokeWidth="1.4"/>
      </g>
    ),
    ppt: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <rect x="8" y="12" width="8" height="5" rx="1" strokeWidth="1.4"/>
        <line x1="12" y1="12" x2="12" y2="10"/>
      </g>
    ),
    image: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </g>
    ),
    video: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="2" y="4" width="14" height="16" rx="2"/>
        <path d="M16 9l6-2v10l-6-2"/>
      </g>
    ),
    audio: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </g>
    ),
    txt: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
      </g>
    ),
    code: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </g>
    ),
    zip: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <line x1="12" y1="10" x2="12" y2="16"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
      </g>
    ),
    default: (
      <g stroke={theme.fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="14 3 14 9 20 9"/>
      </g>
    ),
  };

  const iconKey = icons[t] ? t : 'default';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: theme.bg,
        boxShadow: `0 4px 10px ${theme.shadow}, inset 0 2px 4px rgba(255,255,255,0.5)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative fold corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        borderWidth: `0 ${Math.round(size*0.22)}px ${Math.round(size*0.22)}px 0`,
        borderColor: 'transparent rgba(255,255,255,0.35) transparent transparent',
        borderStyle: 'solid',
        borderBottomLeftRadius: 3,
      }} />
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        {icons[iconKey]}
      </svg>
    </div>
  );
}


/* Individual tool icons */
const TOOL_COLORS = {
  blue:   { bg: 'var(--tool-blue)',   soft: 'var(--tool-blue-soft)' },
  red:    { bg: 'var(--tool-red)',    soft: 'var(--tool-red-soft)' },
  green:  { bg: 'var(--tool-green)',  soft: 'var(--tool-green-soft)' },
  orange: { bg: 'var(--tool-orange)', soft: 'var(--tool-orange-soft)' },
  purple: { bg: 'var(--tool-purple)', soft: 'var(--tool-purple-soft)' },
  teal:   { bg: 'var(--tool-teal)',   soft: 'var(--tool-teal-soft)' },
  pink:   { bg: 'var(--tool-pink)',   soft: 'var(--tool-pink-soft)' },
  indigo: { bg: 'var(--tool-indigo)', soft: 'var(--tool-indigo-soft)' },
};

function Icon({ color, size = 44, children }) {
  const c = TOOL_COLORS[color] || TOOL_COLORS.blue;
  return (
    <ToolIconWrapper bgColor={c.bg} softColor={c.soft} size={size}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </ToolIconWrapper>
  );
}

export const MergeIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M12 8v8m-4-4h8" />
  </Icon>
);

export const SplitIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5.1 5.1M4 4l5 5" />
  </Icon>
);

export const CompressIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="m13 13 6 6" />
  </Icon>
);

export const ScanIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <rect width={10} height={10} x={7} y={7} rx={1} />
  </Icon>
);

export const ExtractPagesIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Icon>
);

export const RemovePagesIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);

export const ReorderIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <line x1={3} y1={12} x2={21} y2={12} />
    <line x1={3} y1={6} x2={21} y2={6} />
    <line x1={3} y1={18} x2={21} y2={18} />
  </Icon>
);

export const RotateIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

export const DuplicateIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <rect width={13} height={13} x={9} y={9} rx={2} ry={2} />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const PDFAIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1={12} y1={12} x2={12} y2={18} />
    <path d="M9 15l3 3 3-3" />
  </Icon>
);

export const WordToPDFIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1={9} y1={15} x2={15} y2={15} />
    <line x1={9} y1={11} x2={15} y2={11} />
  </Icon>
);

export const ExcelToPDFIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m8 13 2 2 4-4" />
  </Icon>
);

export const PPTToPDFIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <rect x={2} y={3} width={20} height={14} rx={2} ry={2} />
    <line x1={8} y1={21} x2={16} y2={21} />
    <line x1={12} y1={17} x2={12} y2={21} />
  </Icon>
);

export const ImageToPDFIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);

export const HTMLToPDFIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
);

export const TXTToPDFIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1={9} y1={15} x2={15} y2={15} />
    <line x1={9} y1={11} x2={15} y2={11} />
  </Icon>
);

export const PDFToWordIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M8 13h2l2-6 2 6h2" />
  </Icon>
);

export const PDFToExcelIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="m8 11 4 4 4-4" />
  </Icon>
);

export const PDFToPPTIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M9 12h1.5a1.5 1.5 0 0 0 0-3H9v6m6-3h.5" />
  </Icon>
);

export const PDFToImageIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);

export const PDFToTXTIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <line x1={9} y1={9} x2={15} y2={9} />
    <line x1={9} y1={13} x2={15} y2={13} />
    <line x1={9} y1={17} x2={11} y2={17} />
  </Icon>
);

export const PDFToHTMLIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
);

export const PDFToMarkdownIcon = ({ size }) => (
  <Icon color="pink" size={size}>
    <path d="M4 6h16M4 12h16M4 18h7" />
    <path d="M15 15l3 3 3-3" />
    <line x1={18} y1={18} x2={18} y2={12} />
  </Icon>
);

export const WatermarkIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

export const OrganizePagesIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <rect x={2} y={7} width={20} height={14} rx={2} ry={2} />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Icon>
);

export const SummarizePDFIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const AskPDFIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <circle cx={12} cy={12} r={10} />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1={12} y1={17} x2={12.01} y2={17} />
  </Icon>
);

export const TranslatePDFIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
  </Icon>
);

export const ExtractTablesIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <line x1={3} y1={9} x2={21} y2={9} />
    <line x1={3} y1={15} x2={21} y2={15} />
    <line x1={9} y1={3} x2={9} y2={21} />
  </Icon>
);

export const OCRIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    <circle cx={19} cy={19} r={2} />
  </Icon>
);

export const CompareIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <path d="M16 3h5v5M4 20L21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l5 5" />
    <path d="M4 4l5 5" />
  </Icon>
);

export const SimilarityIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <circle cx={12} cy={12} r={10} />
    <path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24" />
  </Icon>
);

export const SemanticSearchIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <circle cx={11} cy={11} r={8} />
    <line x1={21} y1={21} x2={16.65} y2={16.65} />
    <path d="m11 8 2 3-2 3" />
  </Icon>
);

export const ClassifyIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <rect x={3} y={3} width={7} height={7} rx={1} />
    <rect x={14} y={3} width={7} height={7} rx={1} />
    <rect x={14} y={14} width={7} height={7} rx={1} />
    <rect x={3} y={14} width={7} height={7} rx={1} />
  </Icon>
);

export const ExtractInfoIcon = ({ size }) => (
  <Icon color="pink" size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx={10} cy={13} r={1} />
    <circle cx={10} cy={17} r={1} />
    <line x1={14} y1={13} x2={16} y2={13} />
    <line x1={14} y1={17} x2={16} y2={17} />
  </Icon>
);

export const WritingAssistIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <path d="m18 2 4 4-10 10H8v-4L18 2z" />
    <path d="m14 6 4 4" />
    <path d="M3 22h18" />
  </Icon>
);

export const QualityCheckerIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const ProtectPDFIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

export const RedactIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <line x1={2} y1={2} x2={22} y2={22} />
  </Icon>
);

export const SignIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <path d="M20 19.5c-2.5 0-4-1-6.5-1s-4.5 1.5-7 1.5-3.5-1-4.5-1.5" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);

export const MetadataIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <circle cx={12} cy={12} r={10} />
    <line x1={12} y1={16} x2={12} y2={12} />
    <line x1={12} y1={8} x2={12.01} y2={8} />
  </Icon>
);

export const EditPDFIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);

export const JpgToPngIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <path d="M16 3h5v5" />
  </Icon>
);

export const PngToJpgIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <path d="M3 16v5h5" />
  </Icon>
);

export const WebpToJpgIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <circle cx={19} cy={5} r={2} />
  </Icon>
);

export const WebpToPngIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <circle cx={5} cy={5} r={2} />
  </Icon>
);

export const HeicToJpgIcon = ({ size }) => (
  <Icon color="pink" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <line x1={8} y1={3} x2={16} y2={3} />
  </Icon>
);

export const BmpToJpgIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <polyline points="21 15 16 10 5 21" />
    <rect x={3} y={3} width={4} height={4} />
  </Icon>
);

export const ImageCompressIcon = ({ color = "orange", size }) => (
  <Icon color={color} size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <path d="M12 8v8" />
    <path d="m8 12 4 4 4-4" />
  </Icon>
);

export const CompressLowIcon = ({ size }) => <ImageCompressIcon color="green" size={size} />;
export const CompressMedIcon = ({ size }) => <ImageCompressIcon color="orange" size={size} />;
export const CompressHighIcon = ({ size }) => <ImageCompressIcon color="red" size={size} />;
export const CompressCustomIcon = ({ size }) => <ImageCompressIcon color="purple" size={size} />;

export const YoutubeIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </Icon>
);

export const SpotifyIcon = ({ size }) => (
  <Icon color="green" size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 11.5c2.5-1 5-1 7.5-.5" />
    <path d="M7 14.5c2-1 4.5-1 6.5-.5" />
    <path d="M9 8.5c3-1 6-1 9-.5" />
  </Icon>
);

export const VideoToolIcon = ({ size, color="blue" }) => (
  <Icon color={color} size={size}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Icon>
);

export const AudioToolIcon = ({ size, color="green" }) => (
  <Icon color={color} size={size}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Icon>
);

/* Map from tool key to icon component */
export const TOOL_ICON_MAP = {

  'edit-pdf':         EditPDFIcon,
  'merge-pdf':        MergeIcon,
  'split-pdf':        SplitIcon,
  'extract-pages':    ExtractPagesIcon,
  'remove-pages':     RemovePagesIcon,
  'reorder-pages':    ReorderIcon,
  'rotate-pdf':       RotateIcon,
  'duplicate-pages':  DuplicateIcon,
  'pdf-to-pdfa':      PDFAIcon,
  'compress-pdf':     CompressIcon,
  'scan-to-pdf':      ScanIcon,
  'watermark':        WatermarkIcon,
  'organize-pages':   OrganizePagesIcon,
  'word-to-pdf':      WordToPDFIcon,
  'excel-to-pdf':     ExcelToPDFIcon,
  'ppt-to-pdf':       PPTToPDFIcon,
  'image-to-pdf':     ImageToPDFIcon,
  'html-to-pdf':      HTMLToPDFIcon,
  'txt-to-pdf':       TXTToPDFIcon,
  'pdf-to-word':      PDFToWordIcon,
  'pdf-to-excel':     PDFToExcelIcon,
  'pdf-to-ppt':       PDFToPPTIcon,
  'pdf-to-image':     PDFToImageIcon,
  'pdf-to-txt':       PDFToTXTIcon,
  'pdf-to-html':      PDFToHTMLIcon,
  'pdf-to-markdown':  PDFToMarkdownIcon,
  'summarize-pdf':    SummarizePDFIcon,
  'ask-pdf':          AskPDFIcon,
  'translate-pdf':    TranslatePDFIcon,
  'extract-tables':   ExtractTablesIcon,
  'ai-ocr':           OCRIcon,
  'ocr':              OCRIcon,
  'semantic-compare': CompareIcon,
  'similarity-matrix': SimilarityIcon,
  'semantic-search':  SemanticSearchIcon,
  'classify-pdf':     ClassifyIcon,
  'extract-info':     ExtractInfoIcon,
  'writing-assistant': WritingAssistIcon,
  'quality-checker':  QualityCheckerIcon,
  'ai-image-enhancer': ImageToPDFIcon,
  'jpg-to-png':       JpgToPngIcon,
  'png-to-jpg':       PngToJpgIcon,
  'webp-to-jpg':      WebpToJpgIcon,
  'webp-to-png':      WebpToPngIcon,
  'webp-convert':     WebpToJpgIcon,
  'heic-to-jpg':      HeicToJpgIcon,
  'bmp-to-jpg':       BmpToJpgIcon,
  'bmp-convert':      BmpToJpgIcon,
  'image-compressor': ImageCompressIcon,
  'compress-low':     CompressLowIcon,
  'compress-medium':  CompressMedIcon,
  'compress-high':    CompressHighIcon,
  'compress-custom':  CompressCustomIcon,
  'youtube-downloader': YoutubeIcon,
  'spotify-downloader': SpotifyIcon,
  'video-to-mp4':       () => <VideoToolIcon color="blue" />,
  'video-to-webm':      () => <VideoToolIcon color="green" />,
  'video-to-mov':       () => <VideoToolIcon color="purple" />,
  'video-to-gif':       () => <VideoToolIcon color="orange" />,
  'video-converter':    () => <VideoToolIcon color="blue" />,
  'vcompress-low':      () => <VideoToolIcon color="green" />,
  'vcompress-medium':   () => <VideoToolIcon color="orange" />,
  'vcompress-high':     () => <VideoToolIcon color="red" />,
  'video-compressor':   () => <VideoToolIcon color="purple" />,
  'audio-to-mp3':       () => <AudioToolIcon color="green" />,
  'audio-to-wav':       () => <AudioToolIcon color="blue" />,
  'audio-to-ogg':       () => <AudioToolIcon color="orange" />,
  'audio-converter':    () => <AudioToolIcon color="teal" />,
  'protect-pdf':      ProtectPDFIcon,
  'smart-redaction':  RedactIcon,
  'digital-sign':     SignIcon,
  'metadata-manager': MetadataIcon,
  'extract-archive':    () => <ToolIconWrapper bgColor="#EA580C" softColor="rgba(234,88,12,0.12)"><Archive size={20} color="#EA580C" /></ToolIconWrapper>,
  'create-zip':         () => <ToolIconWrapper bgColor="#2563EB" softColor="rgba(37,99,235,0.12)"><FileArchive size={20} color="#2563EB" /></ToolIconWrapper>,
  'create-tar':         () => <ToolIconWrapper bgColor="#059669" softColor="rgba(5,150,105,0.12)"><FolderArchive size={20} color="#059669" /></ToolIconWrapper>,
  'convert-archive':    () => <ToolIconWrapper bgColor="#7C3AED" softColor="rgba(124,58,237,0.12)"><Archive size={20} color="#7C3AED" /></ToolIconWrapper>,
  'archive-manager':    () => <ToolIconWrapper bgColor="#EA580C" softColor="rgba(234,88,12,0.12)"><FolderArchive size={20} color="#EA580C" /></ToolIconWrapper>,
};


