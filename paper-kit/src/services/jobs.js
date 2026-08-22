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

export async function runImageOp(operation, fileId, params = {}) {
  const res = await api.post(`/tools/image/${operation}`, { file_id: fileId, ...params });
  return res.data; // returns job doc
}

export async function runVideoOp(operation, fileIds, params = {}) {
  const body = Array.isArray(fileIds)
    ? { file_ids: fileIds, ...params }
    : { file_id: fileIds, ...params };
  const res = await api.post(`/tools/video/${operation}`, body);
  return res.data;
}

export async function runArchiveOp(operation, fileIds, params = {}) {
  const body = Array.isArray(fileIds)
    ? { file_ids: fileIds, ...params }
    : { file_id: fileIds, ...params };
  const res = await api.post(`/tools/archive/${operation}`, body);
  return res.data;
}

export async function getStorageUsage() {
  const res = await api.get('/files/storage-usage');
  return res.data;
}

export async function cloudSyncFile(fileId) {
  const res = await api.post(`/files/${fileId}/cloud-sync`);
  return res.data;
}

export async function getFileMetadata(fileId) {
  const res = await api.get(`/files/${fileId}/metadata`);
  return res.data;
}
