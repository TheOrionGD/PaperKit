/* tools-config.js — Authoritative list of all tools.
   Navigation paths and icon keys must match ToolIcons.jsx and router/index.jsx */

export const ALL_TOOLS = {
  organize: [
    { id: 'merge-pdf',       label: 'Merge PDF',       path: '/tools/merge' },
    { id: 'split-pdf',       label: 'Split PDF',       path: '/tools/split' },
    { id: 'extract-pages',   label: 'Extract Pages',   path: '/tools/extract-pages' },
    { id: 'remove-pages',    label: 'Remove Pages',    path: '/tools/remove-pages' },
    { id: 'reorder-pages',   label: 'Reorder Pages',   path: '/tools/reorder-pages' },
    { id: 'rotate-pdf',      label: 'Rotate PDF',      path: '/tools/rotate' },
    { id: 'duplicate-pages', label: 'Duplicate Pages', path: '/tools/duplicate-pages' },
    { id: 'pdf-to-pdfa',     label: 'PDF to PDF/A',    path: '/tools/pdf-to-pdfa' },
  ],
  convertTo: [
    { id: 'word-to-pdf',   label: 'Word to PDF',   path: '/tools/convert?from=word&to=pdf' },
    { id: 'excel-to-pdf',  label: 'Excel to PDF',  path: '/tools/convert?from=excel&to=pdf' },
    { id: 'ppt-to-pdf',    label: 'PPT to PDF',    path: '/tools/convert?from=ppt&to=pdf' },
    { id: 'image-to-pdf',  label: 'Image to PDF',  path: '/tools/convert?from=image&to=pdf' },
    { id: 'html-to-pdf',   label: 'HTML to PDF',   path: '/tools/convert?from=html&to=pdf' },
    { id: 'txt-to-pdf',    label: 'TXT to PDF',    path: '/tools/convert?from=txt&to=pdf' },
  ],
  convertFrom: [
    { id: 'pdf-to-word',     label: 'PDF to Word',     path: '/tools/convert?from=pdf&to=word' },
    { id: 'pdf-to-excel',    label: 'PDF to Excel',    path: '/tools/convert?from=pdf&to=excel' },
    { id: 'pdf-to-ppt',      label: 'PDF to PPT',      path: '/tools/convert?from=pdf&to=ppt' },
    { id: 'pdf-to-image',    label: 'PDF to Image',    path: '/tools/convert?from=pdf&to=image' },
    { id: 'pdf-to-txt',      label: 'PDF to TXT',      path: '/tools/convert?from=pdf&to=txt' },
    { id: 'pdf-to-html',     label: 'PDF to HTML',     path: '/tools/convert?from=pdf&to=html' },
    { id: 'pdf-to-markdown', label: 'PDF to Markdown', path: '/tools/convert?from=pdf&to=markdown' },
  ],
  optimize: [
    { id: 'compress-pdf',   label: 'Compress PDF',    path: '/tools/compress' },
    { id: 'scan-to-pdf',    label: 'Scan to PDF',     path: '/scanner' },
    { id: 'edit-pdf',       label: 'Edit PDF',        path: '/tools/edit' },
    { id: 'watermark',      label: 'Watermark',       path: '/tools/watermark' },
    { id: 'organize-pages', label: 'Organize Pages',  path: '/tools/organize-pages' },
  ],
  images: [
    { id: 'image-convert',    label: 'Convert Image',    path: '/tools/images?op=convert' },
    { id: 'image-resize',     label: 'Resize Image',     path: '/tools/images?op=resize' },
    { id: 'image-crop',       label: 'Crop Image',       path: '/tools/images?op=crop' },
    { id: 'image-rotate',     label: 'Rotate Image',     path: '/tools/images?op=rotate' },
    { id: 'image-flip',       label: 'Flip Image',       path: '/tools/images?op=flip' },
    { id: 'image-brightness', label: 'Adjust Brightness', path: '/tools/images?op=brightness' },
    { id: 'image-bg-remove',  label: 'Remove BG',        path: '/tools/remove-bg' },
    { id: 'image-watermark',  label: 'Watermark Photo',  path: '/tools/images?op=watermark' },
    { id: 'image-vectorize',  label: 'Vectorize SVG',    path: '/tools/images?op=vectorize' },
  ],
  video: [
    { id: 'video-convert',       label: 'Convert Video',  path: '/tools/video?op=convert' },
    { id: 'video-trim',          label: 'Trim Video',     path: '/tools/video?op=trim' },
    { id: 'video-merge',         label: 'Merge Video',    path: '/tools/video?op=merge' },
    { id: 'video-extract-audio', label: 'Extract Audio',  path: '/tools/extract-audio' },
    { id: 'video-normalize',     label: 'Normalize Audio',path: '/tools/video?op=normalize_audio' },
    { id: 'video-frames',        label: 'Extract Frames', path: '/tools/video?op=extract_frames' },
    { id: 'video-to-gif',        label: 'Frames to GIF',  path: '/tools/video?op=frames_to_gif' },
  ],
  archive: [
    { id: 'archive-extract', label: 'Extract Archive', path: '/tools/archive-extract' },
    { id: 'archive-zip',     label: 'Create ZIP',     path: '/tools/archive?op=create_zip' },
  ],
};

export const QUICK_TOOLS = [
  ALL_TOOLS.organize[0], // Merge PDF
  ALL_TOOLS.organize[1], // Split PDF
  ALL_TOOLS.optimize[0], // Compress PDF
  ALL_TOOLS.optimize[1], // Scan to PDF
  ALL_TOOLS.images[6],   // Remove BG
  ALL_TOOLS.video[3],    // Extract Audio
  ALL_TOOLS.archive[0],  // Extract Archive
];

export const CONVERT_TOOLS = ALL_TOOLS.convertTo.slice(0, 4);
export const EDIT_TOOLS = [
  ALL_TOOLS.optimize[2], // Edit PDF
  ALL_TOOLS.organize[5], // Rotate PDF
  ALL_TOOLS.optimize[3], // Watermark
  ALL_TOOLS.organize[4], // Organize Pages
];

export const AI_TOOLS = [
  { id: 'summarize-pdf',   label: 'Summarize PDF',       description: 'Get a quick summary of your PDF',    path: '/ai/summarize', color: 'purple' },
  { id: 'ask-pdf',         label: 'Ask PDF',             description: 'Ask questions and get answers',      path: '/ai/ask', color: 'blue' },
  { id: 'translate-pdf',   label: 'Translate PDF',       description: 'Translate PDF to any language',      path: '/ai/translate', color: 'green' },
  { id: 'pdf-to-markdown', label: 'PDF to Markdown',     description: 'Convert PDF to Markdown format',     path: '/tools/convert?from=pdf&to=markdown', color: 'orange' },
  { id: 'extract-tables',  label: 'Extract Tables',      description: 'Extract tables and save as Excel',   path: '/ai/extract-tables', color: 'teal' },
];

