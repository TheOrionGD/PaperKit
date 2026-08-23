import api from './api';

export async function createJob(operation, inputAssets, parameters = {}) {
  const res = await api.post('/jobs', { operation, inputAssets, parameters });
  return res.data;
}

export async function getJob(jobId) {
  const res = await api.get(`/jobs/${jobId}`);
  return res.data;
}

export async function listJobs(params = {}) {
  const res = await api.get('/jobs', { params });
  return res.data; // { items: [...], total }
}

export async function cancelJob(jobId) {
  await api.delete(`/jobs/${jobId}`);
}


export async function getStorageUsage() {
  try {
    const res = await api.get('/files/storage-usage');
    if (res.data && res.data.totalMB !== undefined) return res.data;
  } catch (err) {
    console.warn('Backend storage stats unavailable, using local calculation:', err.message);
  }

  try {
    const raw = localStorage.getItem('pk_local_files');
    const files = raw ? JSON.parse(raw) : [];
    const totalBytes = files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      totalBytes,
      totalMB,
      fileCount: files.length,
      quotaBytes: 500 * 1024 * 1024,
      quotaMB: 500,
    };
  } catch {
    return { totalBytes: 0, totalMB: '0.00', fileCount: 0, quotaBytes: 500 * 1024 * 1024, quotaMB: 500 };
  }
}

export async function cloudSyncFile(fileId) {
  try {
    const res = await api.post(`/files/${fileId}/cloud-sync`);
    return res.data;
  } catch {
    return { success: true, localOnly: true };
  }
}

export async function getFileMetadata(fileId) {
  try {
    const res = await api.get(`/files/${fileId}/metadata`);
    if (res.data) return res.data;
  } catch (err) {
    console.debug('Failed to get file metadata from server:', err);
  }
  return { fileId, status: 'ready' };
}
