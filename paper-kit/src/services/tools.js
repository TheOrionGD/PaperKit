import api from './api';

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

const DEFAULT_REGISTRY = [
  { toolId: 'merge-pdf', name: 'Merge PDF', category: 'Organize', route: '/tools/merge', description: 'Combine multiple PDFs into one document', availability: { available: true } },
  { toolId: 'split-pdf', name: 'Split PDF', category: 'Organize', route: '/tools/split', description: 'Split PDF by ranges or extract pages', availability: { available: true } },
  { toolId: 'compress-pdf', name: 'Compress PDF', category: 'Optimize', route: '/tools/compress', description: 'Reduce PDF file size', availability: { available: true } },
  { toolId: 'edit-pdf', name: 'Edit PDF', category: 'Optimize', route: '/tools/edit', description: 'Add text, drawings, and signatures to PDF', availability: { available: true } },
  { toolId: 'rotate-pdf', name: 'Rotate PDF', category: 'Organize', route: '/tools/rotate', description: 'Rotate PDF pages orientation', availability: { available: true } },
  { toolId: 'watermark', name: 'Watermark', category: 'Optimize', route: '/tools/watermark', description: 'Add text watermark to PDF', availability: { available: true } },
  { toolId: 'organize-pages', name: 'Organize Pages', category: 'Organize', route: '/tools/organize-pages', description: 'Reorder, delete or rotate pages', availability: { available: true } },
  { toolId: 'word-to-pdf', name: 'Word to PDF', category: 'Convert', route: '/tools/convert?from=word&to=pdf', description: 'Convert Word document to PDF', availability: { available: true } },
  { toolId: 'pdf-to-word', name: 'PDF to Word', category: 'Convert', route: '/tools/convert?from=pdf&to=word', description: 'Convert PDF to editable Word document', availability: { available: true } },
  { toolId: 'pdf-to-excel', name: 'PDF to Excel', category: 'Convert', route: '/tools/convert?from=pdf&to=excel', description: 'Convert PDF tables to Excel spreadsheet', availability: { available: true } },
  { toolId: 'summarize-pdf', name: 'Summarize PDF', category: 'AI Tools', route: '/ai/summarize', description: 'Get an AI-generated summary of your PDF', availability: { available: true } },
  { toolId: 'ask-pdf', name: 'Ask PDF', category: 'AI Tools', route: '/ai/ask', description: 'Ask questions and chat with your PDF', availability: { available: true } },
  { toolId: 'translate-pdf', name: 'Translate PDF', category: 'AI Tools', route: '/ai/translate', description: 'Translate PDF to any language using AI', availability: { available: true } },
  { toolId: 'extract-tables', name: 'Extract Tables', category: 'AI Tools', route: '/ai/extract-tables', description: 'Extract tables from PDF to Excel', availability: { available: true } },
];

export async function getToolsRegistry() {
  try {
    const res = await api.get('/tools/registry');
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map(t => ({
        ...t,
        availability: { available: true, ...(t.availability || {}) }
      }));
    }
    return DEFAULT_REGISTRY;
  } catch {
    return DEFAULT_REGISTRY;
  }
}

export async function getProcessingHistory() {
  const res = await api.get('/tools/history');
  return res.data;
}

export async function organizePDF(fileId, pages, toolId = 'organize-pages') {
  const res = await api.post('/tools/organize', { file_id: fileId, pages, tool_id: toolId });
  return res.data;
}

export async function applyPDFEdits(fileId, operations) {
  const res = await api.post('/tools/edit/apply', { file_id: fileId, operations });
  return res.data; // { download_url, size }
}
