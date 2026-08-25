import api, { fastGet } from './api';

const LOCAL_FILES_KEY = 'pk_local_files';

export function getStoredLocalFiles() {
  try {
    const raw = localStorage.getItem(LOCAL_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredLocalFiles(files) {
  try {
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files.slice(0, 100)));
  } catch (err) {
    console.debug('Failed to save stored local files:', err);
  }
}

export function getCachedFiles(params = {}) {
  const localList = getStoredLocalFiles();
  let filtered = [...localList];
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(f => (f.original_filename || f.filename || '').toLowerCase().includes(q));
  }
  if (params.category && params.category !== 'all') {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter(f => {
      const ext = (f.original_filename || f.filename || '').split('.').pop()?.toLowerCase();
      if (cat === 'pdf') return ext === 'pdf';
      if (cat === 'word') return ['doc', 'docx'].includes(ext);
      if (cat === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      return true;
    });
  }
  if (params.limit) {
    const skip = params.skip || 0;
    const items = filtered.slice(skip, skip + params.limit);
    return { items, total: filtered.length };
  }
  return { items: filtered, total: filtered.length };
}

export async function listFiles(params = {}) {
  try {
    const res = await fastGet('/files', { params });
    if (res.data && Array.isArray(res.data.items)) {
      // Merge remote items with local storage
      const remoteItems = res.data.items;
      if (remoteItems.length > 0) {
        const existing = getStoredLocalFiles();
        const mergedMap = new Map();
        existing.forEach(f => mergedMap.set(f._id || f.id, f));
        remoteItems.forEach(f => mergedMap.set(f._id || f.id, f));
        saveStoredLocalFiles(Array.from(mergedMap.values()));
      }
      return res.data;
    }
  } catch (err) {
    console.debug('Backend file list sync unavailable, using local cache:', err.message);
  }

  // Resilient instant fallback to cached workspace files
  return getCachedFiles(params);
}

export async function uploadFile(file, onProgress) {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    if (res.data) {
      // Also cache in local files
      const local = getStoredLocalFiles().filter(f => (f._id || f.id) !== (res.data._id || res.data.id));
      local.unshift(res.data);
      saveStoredLocalFiles(local);
      return res.data;
    }
  } catch (err) {
    console.warn('Remote file upload fallback to local workspace:', err.message);
  }

  // Create local workspace file entry
  const localId = 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const localEntry = {
    _id: localId,
    id: localId,
    filename: file.name,
    original_filename: file.name,
    size: file.size,
    content_type: file.type || 'application/pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    storage_url: URL.createObjectURL(file),
    is_local: true,
  };
  const list = getStoredLocalFiles().filter(f => (f._id || f.id) !== localId);
  list.unshift(localEntry);
  saveStoredLocalFiles(list);
  if (onProgress) onProgress(100);
  return localEntry;
}

export async function deleteFile(fileId) {
  try {
    await api.delete(`/files/${fileId}`);
  } catch (err) {
    console.warn('Backend file deletion failed or offline:', err.message);
  }
  const list = getStoredLocalFiles().filter(f => (f._id || f.id) !== fileId);
  saveStoredLocalFiles(list);
}

export async function getFileDownloadUrl(fileId) {
  try {
    const res = await api.get(`/files/${fileId}/download-url`);
    if (res.data?.url) return res.data.url;
  } catch (err) {
    console.debug('Failed to save stored local files:', err);
  }
  const local = getStoredLocalFiles().find(f => (f._id || f.id) === fileId);
  return local?.storage_url || local?.download_url || '#';
}

export async function renameFile(fileId, filename) {
  try {
    const res = await api.patch(`/files/${fileId}/rename`, { filename });
    if (res.data) return res.data;
  } catch (err) {
    console.debug('Failed to save stored local files:', err);
  }
  const list = getStoredLocalFiles().map(f => {
    if ((f._id || f.id) === fileId) {
      return { ...f, original_filename: filename, filename };
    }
    return f;
  });
  saveStoredLocalFiles(list);
  return { id: fileId, original_filename: filename };
}

export async function saveProcessedFile(blob, filename, jobType = 'processed') {
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
    return await uploadFile(file);
  } catch (err) {
    console.warn('Local processed file saved:', err);
    return { name: filename, size: blob.size, type: blob.type, jobType };
  }
}

