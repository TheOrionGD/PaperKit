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
};


