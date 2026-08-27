/* tools-config.js — Authoritative configuration matching PaperKit specification in gv */

export const PDF_TOOLS = [
  { id: 'edit-pdf',        label: 'Edit PDF',        description: 'Convert PDF to Word, edit online & save back to PDF', path: '/tools/edit', color: 'purple' },
  { id: 'merge-pdf',       label: 'Merge PDF',       description: 'Combine multiple PDFs into one', path: '/tools/merge', color: 'blue' },
  { id: 'split-pdf',       label: 'Split PDF',       description: 'Split by ranges, every N or single pages', path: '/tools/split', color: 'red' },
  { id: 'compress-pdf',    label: 'Compress PDF',    description: 'Reduce file size with multi-level optimization', path: '/tools/compress', color: 'orange' },
  { id: 'extract-pages',   label: 'Extract Pages',   description: 'Extract specific pages into new PDF', path: '/tools/extract-pages', color: 'teal' },
  { id: 'rotate-pdf',      label: 'Rotate PDF',      description: 'Rotate page orientation permanently', path: '/tools/rotate', color: 'blue' },
  { id: 'watermark',       label: 'Watermark',       description: 'Add text or logo watermarks', path: '/tools/watermark', color: 'teal' },
  { id: 'organize-pages',  label: 'Organize Pages',  description: 'Reorder, delete, duplicate & rotate', path: '/tools/organize-pages', color: 'indigo' },
];

export const AI_TOOLS = [
  { id: 'ai-ocr',           label: 'OCR Text & Layout',   description: 'Extract text & tables from scans/images', path: '/ai/ocr', color: 'blue' },
  { id: 'summarize-pdf',    label: 'AI Summary',          description: 'Detailed, short, key points & action items', path: '/ai/summarize', color: 'purple' },
  { id: 'semantic-compare', label: 'Semantic Compare',    description: 'Compare meaning & temporal/financial changes', path: '/ai/compare', color: 'purple' },
  { id: 'similarity-matrix',label: 'Similarity Score',    description: 'Pairwise similarity & duplicate detection', path: '/ai/similarity', color: 'indigo' },
  { id: 'ask-pdf',          label: 'AI Document Chat',    description: 'Interactive conversational Q&A and research', path: '/ai/ask', color: 'blue' },
  { id: 'semantic-search',  label: 'Semantic Search',     description: 'Search document by intent and meaning', path: '/ai/search', color: 'teal' },
  { id: 'classify-pdf',     label: 'Document Classify',   description: 'Auto-identify paper, resume, invoice, contract', path: '/ai/classify', color: 'orange' },
  { id: 'extract-info',     label: 'Information Extract', description: 'Structured fields from invoices, CVs & papers', path: '/ai/extract-info', color: 'pink' },
  { id: 'translate-pdf',    label: 'AI Translation',      description: 'Translate into 15+ languages', path: '/ai/translate', color: 'green' },
  { id: 'writing-assistant',label: 'Writing Assistant',   description: 'Grammar, paraphrase, formal & tone polish', path: '/ai/writing-assist', color: 'green' },
  { id: 'quality-checker',  label: 'Quality Checker',     description: 'Audit structure, citations & readability', path: '/ai/quality-checker', color: 'teal' },
];

export const SECURITY_TOOLS = [
  { id: 'protect-pdf',      label: 'Protect PDF',      description: '256-bit AES password encryption & permissions', path: '/security/protect', color: 'red' },
  { id: 'smart-redaction',  label: 'Redact Data',      description: 'AI privacy scan & permanent blackouts', path: '/security/redact', color: 'orange' },
  { id: 'digital-sign',     label: 'Digital Sign',     description: 'Draw, type, or stamp digital signatures', path: '/security/sign', color: 'indigo' },
  { id: 'metadata-manager', label: 'Metadata Manager', description: 'Inspect, edit, or sanitize metadata for privacy', path: '/security/metadata', color: 'blue' },
];

export const CONVERT_TOOLS = [
  { id: 'word-to-pdf',   label: 'Word to PDF',   path: '/tools/convert?from=word&to=pdf' },
  { id: 'pdf-to-word',   label: 'PDF to Word',   path: '/tools/convert?from=pdf&to=word' },
  { id: 'excel-to-pdf',  label: 'Excel to PDF',  path: '/tools/convert?from=excel&to=pdf' },
  { id: 'pdf-to-excel',  label: 'PDF to Excel',  path: '/tools/convert?from=pdf&to=excel' },
  { id: 'ppt-to-pdf',    label: 'PPT to PDF',    path: '/tools/convert?from=ppt&to=pdf' },
  { id: 'pdf-to-ppt',    label: 'PDF to PPT',    path: '/tools/convert?from=pdf&to=ppt' },
  { id: 'image-to-pdf',  label: 'Image to PDF',  path: '/tools/convert?from=image&to=pdf' },
  { id: 'pdf-to-image',  label: 'PDF to Image',  path: '/tools/convert?from=pdf&to=image' },
];

export const IMAGE_FORMAT_TOOLS = [
  { id: 'jpg-to-png',  label: 'JPG to PNG',    description: 'Convert JPG to PNG', path: '/tools/image-converter?from=jpg&to=png', color: 'blue' },
  { id: 'png-to-jpg',  label: 'PNG to JPG',    description: 'Convert PNG to JPG', path: '/tools/image-converter?from=png&to=jpg', color: 'green' },
  { id: 'webp-convert',label: 'WebP to JPG/PNG', description: 'Convert WebP to JPG or PNG', path: '/tools/image-converter?from=webp', color: 'teal' },
  { id: 'heic-to-jpg', label: 'HEIC to JPG',   description: 'Convert Apple HEIC to JPG', path: '/tools/image-converter?from=heic&to=jpg', color: 'pink' },
  { id: 'bmp-convert', label: 'BMP to JPG/PNG',  description: 'Convert BMP to JPG or PNG', path: '/tools/image-converter?from=bmp', color: 'indigo' },
];

export const IMAGE_COMPRESS_TOOLS = [
  { id: 'compress-low',    label: 'Low Compression',    description: 'High quality, larger file size', path: '/tools/image-compressor?preset=low', color: 'green' },
  { id: 'compress-medium', label: 'Medium Compression', description: 'Balanced quality & size', path: '/tools/image-compressor?preset=medium', color: 'orange' },
  { id: 'compress-high',   label: 'High Compression',   description: 'Smaller file size, lower quality', path: '/tools/image-compressor?preset=high', color: 'red' },
  { id: 'compress-custom', label: 'Custom Compression', description: 'User selects compression level', path: '/tools/image-compressor?preset=custom', color: 'purple' },
];

export const VIDEO_FORMAT_TOOLS = [
  { id: 'video-to-mp4', label: 'Convert to MP4', description: 'Convert to MP4 format', path: '/tools/video-converter?to=mp4', color: 'blue' },
  { id: 'video-to-webm', label: 'Convert to WebM', description: 'Convert to WebM format', path: '/tools/video-converter?to=webm', color: 'green' },
  { id: 'video-to-mov', label: 'Convert to MOV', description: 'Convert to MOV format', path: '/tools/video-converter?to=mov', color: 'purple' },
  { id: 'video-to-gif', label: 'Convert to GIF', description: 'Convert to animated GIF', path: '/tools/video-converter?to=gif', color: 'orange' },
];

export const VIDEO_COMPRESS_TOOLS = [
  { id: 'vcompress-low', label: 'Low Compression', description: 'High quality, large size', path: '/tools/video-compressor?preset=low', color: 'green' },
  { id: 'vcompress-medium', label: 'Medium Compression', description: 'Balanced quality & size', path: '/tools/video-compressor?preset=medium', color: 'orange' },
  { id: 'vcompress-high', label: 'High Compression', description: 'Small file size', path: '/tools/video-compressor?preset=high', color: 'red' },
];

export const AUDIO_FORMAT_TOOLS = [
  { id: 'audio-to-mp3', label: 'Convert to MP3', description: 'Standard audio format', path: '/tools/audio-converter?to=mp3', color: 'green' },
  { id: 'audio-to-wav', label: 'Convert to WAV', description: 'Lossless audio format', path: '/tools/audio-converter?to=wav', color: 'blue' },
  { id: 'audio-to-ogg', label: 'Convert to OGG', description: 'Web audio format', path: '/tools/audio-converter?to=ogg', color: 'orange' },
];

export const MEDIA_DOWNLOADER_TOOLS = [
  { id: 'youtube-downloader', label: 'YouTube Video', description: 'Download YouTube videos as MP4', path: '/tools/media-downloader?type=youtube', color: 'red' },
  { id: 'spotify-downloader', label: 'Spotify Audio', description: 'Download Spotify tracks as MP3', path: '/tools/media-downloader?type=spotify', color: 'green' },
];

export const ARCHIVE_TOOLS = [
  { id: 'extract-archive', label: 'Extract & View Archive', description: 'Extract .ZIP, .RAR, .TAR, .GZ, .7Z & .BZ2 files', path: '/tools/archive?mode=extract', color: 'orange' },
  { id: 'create-zip',       label: 'Create ZIP Archive',    description: 'Compress and package multiple files to .ZIP', path: '/tools/archive?mode=create&format=zip', color: 'blue' },
  { id: 'create-tar',       label: 'Create TAR / GZ',       description: 'Pack folders into .TAR & .TAR.GZ archives', path: '/tools/archive?mode=create&format=tar', color: 'green' },
  { id: 'convert-archive',  label: 'Convert Archive',       description: 'Convert RAR, 7Z, TAR & BZ2 to universal ZIP', path: '/tools/archive?mode=extract', color: 'purple' },
  { id: 'archive-manager',  label: 'Archive Studio',        description: 'Complete multi-format archive manager suite', path: '/tools/archive', color: 'orange' },
];

export const QUICK_TOOLS = [
  PDF_TOOLS[0], // Edit PDF
  PDF_TOOLS[1], // Merge PDF
  PDF_TOOLS[2], // Split PDF
  PDF_TOOLS[3], // Compress PDF
  AI_TOOLS[1],  // AI Summary
  AI_TOOLS[4],  // AI Document Chat
  SECURITY_TOOLS[0], // Protect PDF
  SECURITY_TOOLS[1], // Redact Data
];

export const ALL_TOOLS = {
  pdf: PDF_TOOLS,
  ai: AI_TOOLS,
  security: SECURITY_TOOLS,
  convert: CONVERT_TOOLS,
  archive: ARCHIVE_TOOLS,
  imageFormat: IMAGE_FORMAT_TOOLS,
  imageCompress: IMAGE_COMPRESS_TOOLS,
  videoFormat: VIDEO_FORMAT_TOOLS,
  videoCompress: VIDEO_COMPRESS_TOOLS,
  audioFormat: AUDIO_FORMAT_TOOLS,
  mediaDownloader: MEDIA_DOWNLOADER_TOOLS,
};



