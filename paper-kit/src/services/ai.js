/* ai.js — Frontend AI service. All calls are server-mediated; API key stays backend-only. */
import api from './api';

export async function summarizePDF(fileId, options = {}) {
  const payload = typeof options === 'string' 
    ? { file_id: fileId, language: options } 
    : { file_id: fileId, ...options };
  const res = await api.post('/ai/summarize', payload);
  return res.data; // { summary: string, mode: string, language: string }
}

export async function ocrDocument(fileId) {
  const res = await api.post('/ai/ocr', { file_id: fileId });
  return res.data; // { text: string, ocr: string }
}

export async function compareDocuments(fileIdA, fileIdB, textA, textB) {
  const res = await api.post('/ai/compare', {
    file_id_a: fileIdA,
    file_id_b: fileIdB,
    text_a: textA,
    text_b: textB,
  });
  return res.data; // { similarity_score, similarity_category, summary, changes }
}

export async function similarityMatrix(fileIds, documents) {
  const res = await api.post('/ai/similarity-matrix', {
    file_ids: fileIds,
    documents: documents,
  });
  return res.data; // { matrix: [], duplicates: [] }
}

export async function semanticSearch(fileId, query, text) {
  const res = await api.post('/ai/search', {
    file_id: fileId,
    query: query,
    text: text,
  });
  return res.data; // { query, results: [] }
}

export async function classifyDocument(fileId, text) {
  const res = await api.post('/ai/classify', {
    file_id: fileId,
    text: text,
  });
  return res.data; // { category, confidence, language, summary, key_sections, suggested_tools }
}

export async function extractInformation(fileId, schemaType = 'auto', text) {
  const res = await api.post('/ai/extract-info', {
    file_id: fileId,
    schema_type: schemaType,
    text: text,
  });
  return res.data; // { schema_detected, fields, tables, entities }
}

export async function writingAssistant(text, task = 'grammar_spelling', customInstruction = null, fileId = null) {
  const res = await api.post('/ai/writing-assist', {
    text: text,
    task: task,
    custom_instruction: customInstruction,
    file_id: fileId,
  });
  return res.data; // { task, improved_text, explanation, improvements }
}

export async function detectPrivacy(fileId, text) {
  const res = await api.post('/ai/detect-privacy', {
    file_id: fileId,
    text: text,
  });
  return res.data; // { total_found, risk_level, entities: [] }
}

export async function qualityCheckDocument(fileId, text) {
  const res = await api.post('/ai/quality-check', {
    file_id: fileId,
    text: text,
  });
  return res.data; // { overall_score, readability_grade, summary, items, recommendations }
}

export async function askPDF(fileId, question, text) {
  const res = await api.post('/ai/ask', { file_id: fileId, question, text });
  return res.data; // { answer: string }
}

export async function translatePDF(fileId, targetLanguage, text) {
  const res = await api.post('/ai/translate', { file_id: fileId, target_language: targetLanguage, text });
  return res.data; // { translation: string }
}
export const translateDocument = translatePDF;


export async function extractTables(fileId, text) {
  const res = await api.post('/ai/extract-tables', { file_id: fileId, text });
  return res.data; // { tables: string (markdown) }
}

export async function pdfToMarkdown(fileId, text) {
  const res = await api.post('/ai/pdf-to-markdown', { file_id: fileId, text });
  return res.data; // { markdown: string }
}

