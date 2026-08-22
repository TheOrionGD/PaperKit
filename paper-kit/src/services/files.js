import api from './api';

export async function listFiles(params = {}) {
  const res = await api.get('/files', { params });
  return res.data; // { items: [...], total: n }
}

export async function uploadFile(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data;
}

export async function deleteFile(fileId) {
  await api.delete(`/files/${fileId}`);
}

export async function getFileDownloadUrl(fileId) {
  const res = await api.get(`/files/${fileId}/download-url`);
  return res.data.url;
}

export async function renameFile(fileId, filename) {
  const res = await api.patch(`/files/${fileId}/rename`, { filename });
  return res.data;
}

export async function saveProcessedFile(blob, filename, jobType = 'processed') {
  try {
    const file = new File([blob], filename, { type: blob.type });
    return await uploadFile(file);
  } catch (err) {
    console.warn('Backend file sync not available, handled locally:', err);
    return { name: filename, size: blob.size, type: blob.type, jobType };
  }
}

