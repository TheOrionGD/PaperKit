/* eslint-disable react-refresh/only-export-components */
/* ToolIcons.jsx — SVG icon components for all PaperKit tools.
   Each icon uses a colored rounded-square background with a white pictogram.
   Colors come from design tokens. */


/* Generic icon wrapper with colored bg */
export function ToolIconWrapper({ bgColor, softColor, size = 44, children }) {
  return (
    <div
      className="tool-icon-box"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: softColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ color: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}


/* File type icons for file cards */
export function FileTypeIcon({ type, size = 36 }) {
  const colors = {
    pdf: { bg: '#FEE2E2', fg: '#EF4444' },
    word: { bg: '#DBEAFE', fg: '#2563EB' },
    excel: { bg: '#D1FAE5', fg: '#10B981' },
    ppt: { bg: '#FEF3C7', fg: '#F59E0B' },
    image: { bg: '#EDE9FE', fg: '#8B5CF6' },
    default: { bg: '#F3F4F6', fg: '#6B7280' },
  };
  const c = colors[type?.toLowerCase()] || colors.default;

  const labels = {
    pdf: 'PDF',
    word: 'W',
    excel: 'XLS',
    ppt: 'PPT',
    image: 'IMG',
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: c.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: c.fg, letterSpacing: 0.3 }}>
        {labels[type?.toLowerCase()] || type?.slice(0, 3).toUpperCase() || '?'}
      </span>
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

export const EditPDFIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

/* --- Additional Missing Icons (Images, Videos, Archives) --- */

export const ImageEditIcon = ({ size }) => (
  <Icon color="pink" size={size}>
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <circle cx={8.5} cy={8.5} r={1.5} />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);

export const ImageResizeIcon = ({ size }) => (
  <Icon color="teal" size={size}>
    <path d="M21 3l-6 6" />
    <path d="M21 3v6" />
    <path d="M21 3h-6" />
    <path d="M3 21l6-6" />
    <path d="M3 21v-6" />
    <path d="M3 21h6" />
  </Icon>
);

export const ImageCropIcon = ({ size }) => (
  <Icon color="purple" size={size}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </Icon>
);

export const ImageRotateIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </Icon>
);

export const ImageFlipIcon = ({ size }) => (
  <Icon color="indigo" size={size}>
    <path d="M12 2v20" />
    <path d="M4 8l-2 4 2 4" />
    <path d="M20 8l2 4-2 4" />
  </Icon>
);

export const ImageEffectsIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <circle cx={12} cy={12} r={10} />
    <path d="M12 2v20" />
    <path d="M12 12a10 10 0 0 1 0-20" />
  </Icon>
);

export const VideoEditIcon = ({ size }) => (
  <Icon color="red" size={size}>
    <rect x={2} y={2} width={20} height={20} rx={2} ry={2} />
    <line x1={2} y1={7} x2={22} y2={7} />
    <line x1={2} y1={17} x2={22} y2={17} />
    <line x1={7} y1={2} x2={7} y2={22} />
    <line x1={17} y1={2} x2={17} y2={22} />
  </Icon>
);

export const VideoAudioIcon = ({ size }) => (
  <Icon color="blue" size={size}>
    <path d="M9 18V5l12-2v13" />
    <circle cx={6} cy={18} r={3} />
    <circle cx={18} cy={16} r={3} />
  </Icon>
);

export const ArchiveIcon = ({ size }) => (
  <Icon color="orange" size={size}>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x={1} y={3} width={22} height={5} />
    <line x1={10} y1={12} x2={14} y2={12} />
  </Icon>
);

/* Map from tool key to icon component */
export const TOOL_ICON_MAP = {
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
  'edit-pdf':         EditPDFIcon,
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

  // Image Tools
  'image-convert':    ImageEditIcon,
  'image-resize':     ImageResizeIcon,
  'image-crop':       ImageCropIcon,
  'image-rotate':     ImageRotateIcon,
  'image-flip':       ImageFlipIcon,
  'image-brightness': ImageEffectsIcon,
  'image-contrast':   ImageEffectsIcon,
  'image-saturation': ImageEffectsIcon,
  'image-sharpness':  ImageEffectsIcon,
  'image-bg-remove':  ImageEditIcon,
  'image-watermark':  WatermarkIcon,
  'image-vectorize':  ImageEditIcon,

  // Video Tools
  'video-convert':    VideoEditIcon,
  'video-transcode':  VideoEditIcon,
  'video-trim':       SplitIcon,
  'video-merge':      MergeIcon,
  'video-extract-audio': VideoAudioIcon,
  'video-normalize':  VideoAudioIcon,
  'video-frames':     ImageEditIcon,
  'video-to-video':   VideoEditIcon,
  'video-to-gif':     ImageEditIcon,

  // Archive Tools
  'archive-extract':  ArchiveIcon,
  'archive-zip':      ArchiveIcon,
};
