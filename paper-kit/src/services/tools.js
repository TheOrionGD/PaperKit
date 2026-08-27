import api, { fastGet } from './api';

export const DEFAULT_REGISTRY = [
  // PDF Management
  { toolId: 'edit-pdf', name: 'Edit PDF', category: 'PDF Tools', route: '/tools/edit', description: 'Convert PDF to Word, edit in web editor, and save back to PDF', availability: { available: true } },
  { toolId: 'merge-pdf', name: 'Merge PDF', category: 'PDF Tools', route: '/tools/merge', description: 'Combine multiple PDFs in custom order', availability: { available: true } },
  { toolId: 'split-pdf', name: 'Split PDF', category: 'PDF Tools', route: '/tools/split', description: 'Split PDF by ranges, every N pages, or single pages', availability: { available: true } },
  { toolId: 'extract-pages', name: 'Extract Pages', category: 'PDF Tools', route: '/tools/extract-pages', description: 'Select and extract specific pages', availability: { available: true } },
  { toolId: 'organize-pages', name: 'Organize Pages', category: 'PDF Tools', route: '/tools/organize-pages', description: 'Delete, reorder, duplicate & rotate pages', availability: { available: true } },
  { toolId: 'rotate-pdf', name: 'Rotate PDF', category: 'PDF Tools', route: '/tools/rotate', description: 'Rotate PDF pages permanently', availability: { available: true } },
  { toolId: 'compress-pdf', name: 'Compress PDF', category: 'PDF Tools', route: '/tools/compress', description: 'Reduce PDF file size with multi-level optimization', availability: { available: true } },
  { toolId: 'watermark', name: 'Watermark', category: 'PDF Tools', route: '/tools/watermark', description: 'Add confidential text/image watermarks', availability: { available: true } },
  
  // Conversions
  { toolId: 'word-to-pdf', name: 'Word to PDF', category: 'Convert', route: '/tools/convert?from=word&to=pdf', description: 'Convert Word documents to PDF', availability: { available: true } },
  { toolId: 'pdf-to-word', name: 'PDF to Word', category: 'Convert', route: '/tools/convert?from=pdf&to=word', description: 'Convert PDF to editable Word document', availability: { available: true } },
  { toolId: 'pdf-to-excel', name: 'PDF to Excel', category: 'Convert', route: '/tools/convert?from=pdf&to=excel', description: 'Extract tables to Excel spreadsheet', availability: { available: true } },
  { toolId: 'excel-to-pdf', name: 'Excel to PDF', category: 'Convert', route: '/tools/convert?from=excel&to=pdf', description: 'Convert spreadsheets to PDF', availability: { available: true } },
  { toolId: 'pdf-to-ppt', name: 'PDF to PPT', category: 'Convert', route: '/tools/convert?from=pdf&to=ppt', description: 'Convert PDF pages to PowerPoint slides', availability: { available: true } },
  { toolId: 'ppt-to-pdf', name: 'PPT to PDF', category: 'Convert', route: '/tools/convert?from=ppt&to=pdf', description: 'Convert presentations to PDF', availability: { available: true } },
  { toolId: 'pdf-to-image', name: 'PDF to Image', category: 'Convert', route: '/tools/convert?from=pdf&to=image', description: 'Convert PDF pages to high-res images', availability: { available: true } },
  { toolId: 'image-to-pdf', name: 'Image to PDF', category: 'Convert', route: '/tools/convert?from=image&to=pdf', description: 'Convert JPG/PNG images to PDF', availability: { available: true } },
  
  // Image Tools
  { toolId: 'jpg-to-png', name: 'JPG to PNG', category: 'Image Tools', route: '/tools/image-converter?from=jpg&to=png', description: 'Convert JPG images to PNG format', availability: { available: true } },
  { toolId: 'png-to-jpg', name: 'PNG to JPG', category: 'Image Tools', route: '/tools/image-converter?from=png&to=jpg', description: 'Convert PNG images to JPG format', availability: { available: true } },
  { toolId: 'webp-to-jpg', name: 'WebP to JPG', category: 'Image Tools', route: '/tools/image-converter?from=webp&to=jpg', description: 'Convert WebP images to JPG format', availability: { available: true } },
  { toolId: 'webp-to-png', name: 'WebP to PNG', category: 'Image Tools', route: '/tools/image-converter?from=webp&to=png', description: 'Convert WebP images to PNG format', availability: { available: true } },
  { toolId: 'heic-to-jpg', name: 'HEIC to JPG', category: 'Image Tools', route: '/tools/image-converter?from=heic&to=jpg', description: 'Convert Apple HEIC photos to JPG', availability: { available: true } },
  { toolId: 'bmp-to-jpg', name: 'BMP to JPG', category: 'Image Tools', route: '/tools/image-converter?from=bmp&to=jpg', description: 'Convert Bitmap images to JPG', availability: { available: true } },
  { toolId: 'image-compressor', name: 'Image Compressor', category: 'Image Tools', route: '/tools/image-compressor', description: 'Compress images with multiple quality presets', availability: { available: true }, capabilities: ['compress', 'optimize', 'resize'] },  
  // AI Tools
  { toolId: 'ai-ocr', name: 'OCR Text Detection', category: 'AI Tools', route: '/ai/ocr', description: 'Extract text & layout from scanned PDFs and images', availability: { available: true } },
  { toolId: 'summarize-pdf', name: 'AI Summary', category: 'AI Tools', route: '/ai/summarize', description: 'Smart summary, key points, findings & action items', availability: { available: true } },
  { toolId: 'semantic-compare', name: 'Semantic Compare', category: 'AI Tools', route: '/ai/compare', description: 'Compare meaning & detect temporal/financial changes', availability: { available: true } },
  { toolId: 'similarity-matrix', name: 'Similarity Score', category: 'AI Tools', route: '/ai/similarity', description: 'Calculate document similarity % and duplicate detection', availability: { available: true } },
  { toolId: 'ask-pdf', name: 'AI Document Chat', category: 'AI Tools', route: '/ai/ask', description: 'Interactive Q&A and conversational research', availability: { available: true } },
  { toolId: 'semantic-search', name: 'Semantic Search', category: 'AI Tools', route: '/ai/search', description: 'Search document by intent and conceptual meaning', availability: { available: true } },
  { toolId: 'classify-pdf', name: 'Document Classification', category: 'AI Tools', route: '/ai/classify', description: 'Auto-identify document category and structure', availability: { available: true } },
  { toolId: 'extract-info', name: 'Information Extraction', category: 'AI Tools', route: '/ai/extract-info', description: 'Extract structured fields from invoices, resumes & papers', availability: { available: true } },
  { toolId: 'translate-pdf', name: 'AI Translation', category: 'AI Tools', route: '/ai/translate', description: 'Translate document into 15+ languages', availability: { available: true } },
  { toolId: 'writing-assistant', name: 'Writing Assistant', category: 'AI Tools', route: '/ai/writing-assist', description: 'Grammar, paraphrasing, simplifying & formal rewrite', availability: { available: true } },
  { toolId: 'quality-checker', name: 'Quality Checker', category: 'AI Tools', route: '/ai/quality-checker', description: 'Audit structure, citations, consistency & readability', availability: { available: true } },
  { toolId: 'ai-image-enhancer', name: 'AI Image Enhancer', category: 'AI Tools', route: '/ai/image-enhancer', description: 'Upscale and enhance image quality using AI', availability: { available: true }, capabilities: ['upscale', 'enhance', 'resolution'] },

  // Security & Privacy
  { toolId: 'protect-pdf', name: 'Protect PDF', category: 'Security', route: '/security/protect', description: 'Password protection and AES encryption', availability: { available: true } },
  { toolId: 'smart-redaction', name: 'Redact Data', category: 'Security', route: '/security/redact', description: 'Detect and blackout sensitive PII data', availability: { available: true } },
  { toolId: 'digital-sign', name: 'Digital Signature', category: 'Security', route: '/security/sign', description: 'Draw, upload or stamp digital signatures', availability: { available: true } },
  { toolId: 'metadata-manager', name: 'Metadata Manager', category: 'Security', route: '/security/metadata', description: 'View, edit or sanitize PDF metadata for privacy', availability: { available: true } },

  // Archive & Compression Tools (.ZIP, .RAR, .TAR, .GZ, .7Z, .BZ2)
  { toolId: 'extract-archive', name: 'Extract Archive (.ZIP, .RAR, .TAR, .GZ, .7Z, .BZ2)', category: 'Archive Tools', route: '/tools/archive?mode=extract', description: 'Extract and inspect files from ZIP, RAR, TAR, GZ, 7Z, and BZ2 archives', availability: { available: true }, capabilities: ['extract', 'inspect', 'decompress'] },
  { toolId: 'create-zip', name: 'Create ZIP Archive', category: 'Archive Tools', route: '/tools/archive?mode=create&format=zip', description: 'Pack and compress multiple files into a universal .ZIP archive', availability: { available: true }, capabilities: ['zip', 'compress', 'package'] },
  { toolId: 'create-tar', name: 'Create TAR / GZ Archive', category: 'Archive Tools', route: '/tools/archive?mode=create&format=tar', description: 'Create uncompressed TAR and compressed TAR.GZ packages', availability: { available: true }, capabilities: ['tar', 'gzip', 'package'] },
  { toolId: 'convert-archive', name: 'Convert Archive Format', category: 'Archive Tools', route: '/tools/archive?mode=extract', description: 'Convert RAR, 7Z, TAR, and BZ2 to universal ZIP archive', availability: { available: true }, capabilities: ['convert', 'zip'] },
  { toolId: 'archive-manager', name: 'Archive Studio', category: 'Archive Tools', route: '/tools/archive', description: 'Complete multi-format archive extraction and compression suite', availability: { available: true }, capabilities: ['archive', 'zip', 'tar', 'extract'] },

  // Video Tools
  { toolId: 'video-to-mp4', name: 'Convert to MP4', category: 'Video Tools', route: '/tools/video-converter?to=mp4', description: 'Convert video files to universal MP4 format', availability: { available: true } },
  { toolId: 'video-to-webm', name: 'Convert to WebM', category: 'Video Tools', route: '/tools/video-converter?to=webm', description: 'Convert videos to high-efficiency WebM', availability: { available: true } },
  { toolId: 'video-to-mov', name: 'Convert to MOV', category: 'Video Tools', route: '/tools/video-converter?to=mov', description: 'Convert videos to Apple QuickTime MOV', availability: { available: true } },
  { toolId: 'video-to-gif', name: 'Convert to GIF', category: 'Video Tools', route: '/tools/video-converter?to=gif', description: 'Convert video clips to animated GIF', availability: { available: true } },
  { toolId: 'vcompress-low', name: 'Video Compressor (Light)', category: 'Video Tools', route: '/tools/video-compressor?preset=low', description: 'Light video compression with maximum quality', availability: { available: true } },
  { toolId: 'vcompress-medium', name: 'Video Compressor (Balanced)', category: 'Video Tools', route: '/tools/video-compressor?preset=medium', description: 'Balanced video compression for sharing', availability: { available: true } },
  { toolId: 'vcompress-high', name: 'Video Compressor (Extreme)', category: 'Video Tools', route: '/tools/video-compressor?preset=high', description: 'Maximum file size reduction for videos', availability: { available: true } },

  // Audio Tools
  { toolId: 'audio-to-mp3', name: 'Convert to MP3', category: 'Audio Tools', route: '/tools/audio-converter?to=mp3', description: 'Convert audio tracks to standard MP3 format', availability: { available: true } },
  { toolId: 'audio-to-wav', name: 'Convert to WAV', category: 'Audio Tools', route: '/tools/audio-converter?to=wav', description: 'Convert audio to lossless uncompressed WAV', availability: { available: true } },
  { toolId: 'audio-to-ogg', name: 'Convert to OGG', category: 'Audio Tools', route: '/tools/audio-converter?to=ogg', description: 'Convert audio to web-optimized OGG Vorbis', availability: { available: true } },

  // Media Downloader
  { toolId: 'youtube-downloader', name: 'YouTube Video Downloader', category: 'Media Downloader', route: '/tools/media-downloader?type=youtube', description: 'Download YouTube videos as high-res MP4', availability: { available: true } },
  { toolId: 'spotify-downloader', name: 'Spotify Audio Downloader', category: 'Media Downloader', route: '/tools/media-downloader?type=spotify', description: 'Download Spotify tracks as high-bitrate MP3', availability: { available: true } },
];

let cachedRegistry = DEFAULT_REGISTRY;

export function getToolsRegistrySync() {
  try {
    const raw = localStorage.getItem('pk_tools_registry');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore error
  }
  return cachedRegistry;
}

export async function getToolsRegistry() {
  // Always return local cached registry immediately for 0ms latency
  const current = getToolsRegistrySync();
  
  // Non-blocking background revalidation
  fastGet('/tools/registry')
    .then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map(t => ({
          ...t,
          availability: { available: true, ...(t.availability || {}) }
        }));
        cachedRegistry = mapped;
        try { localStorage.setItem('pk_tools_registry', JSON.stringify(mapped)); } catch { /* ignore storage error */ }
      }
    })
    .catch(() => {});

  return current;
}

export async function getProcessingHistory() {
  let localHistory = [];
  try {
    const raw = localStorage.getItem('pk_local_history');
    if (raw) localHistory = JSON.parse(raw);
  } catch {
    localHistory = [];
  }

  // Attempt fast revalidation from server
  try {
    const res = await fastGet('/tools/history');
    if (Array.isArray(res.data) && res.data.length > 0) {
      try { localStorage.setItem('pk_local_history', JSON.stringify(res.data)); } catch { /* ignore storage error */ }
      return res.data;
    }
  } catch (err) {
    console.debug('Backend history sync unavailable, using cached history:', err.message);
  }
  
  return localHistory;
}

export async function mergePDF(fileIds, options) {
  const res = await api.post('/tools/merge', { file_ids: fileIds, options });
  return res.data;
}

export async function splitPDF(fileId, options) {
  const res = await api.post('/tools/split', { file_id: fileId, ...options });
  return res.data;
}

export async function compressPDF(fileId, quality) {
  const res = await api.post('/tools/compress', { file_id: fileId, quality });
  return res.data;
}

export async function convertFile(fileId, fromFormat, toFormat, options = {}) {
  const res = await api.post('/tools/convert', {
    file_id: fileId,
    from_format: fromFormat,
    to_format: toFormat,
    ...options,
  });
  return res.data;
}

export async function estimateCompression(fileId, quality) {
  const res = await api.post('/tools/compress/estimate', { file_id: fileId, quality });
  return res.data; // { original_size, estimated_size, reduction_pct }
}

export async function rotatePDF(fileId, degrees, pages) {
  const res = await api.post('/tools/rotate', { file_id: fileId, degrees, pages });
  return res.data;
}

export async function addWatermark(fileId, options) {
  const res = await api.post('/tools/watermark', { file_id: fileId, ...options });
  return res.data;
}

export async function protectPDF(fileId, options) {
  const res = await api.post('/tools/protect', { file_id: fileId, ...options });
  return res.data;
}

export async function signPDF(fileId, signatures) {
  const res = await api.post('/tools/sign', { file_id: fileId, signatures });
  return res.data;
}

export async function getPDFMetadata(fileId) {
  const res = await api.get(`/tools/metadata/${fileId}`);
  return res.data;
}

export async function updatePDFMetadata(fileId, updates, wipeAll = false) {
  const res = await api.post('/tools/metadata', { file_id: fileId, updates, wipe_all: wipeAll });
  return res.data;
}

export async function redactPDF(fileId, terms) {
  const res = await api.post('/tools/redact', { file_id: fileId, terms });
  return res.data;
}

export async function convertHtmlToWord(htmlContent, filename = 'edited_document.docx') {
  const res = await api.post('/tools/html-to-word', {
    html_content: htmlContent,
    filename,
  });
  return res.data;
}



export async function organizePDF(fileId, pages, toolId = 'organize-pages') {
  const res = await api.post('/tools/organize', { file_id: fileId, pages, tool_id: toolId });
  return res.data;
}



