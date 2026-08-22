/* ai.js — Frontend AI service. All calls are server-mediated; API key stays backend-only. */
import api from './api';

export async function summarizePDF(fileId, language = 'English') {
  const res = await api.post('/ai/summarize', { file_id: fileId, language });
  return res.data; // { summary: string }
}

export async function askPDF(fileId, question) {
  const res = await api.post('/ai/ask', { file_id: fileId, question });
  return res.data; // { answer: string }
}

export async function translatePDF(fileId, targetLanguage) {
  const res = await api.post('/ai/translate', { file_id: fileId, target_language: targetLanguage });
  return res.data; // { translation: string }
}

export async function extractTables(fileId) {
  const res = await api.post('/ai/extract-tables', { file_id: fileId });
  return res.data; // { tables: string (markdown) }
}

export async function pdfToMarkdown(fileId) {
  const res = await api.post('/ai/pdf-to-markdown', { file_id: fileId });
  return res.data; // { markdown: string }
}
