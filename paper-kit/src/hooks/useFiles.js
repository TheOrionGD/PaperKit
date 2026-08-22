import { useState, useEffect, useCallback } from 'react';
import { listFiles, deleteFile } from '../services/files';

export function useFiles(params = {}) {
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFiles(params);
      setFiles(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]); // eslint-disable-line

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const remove = useCallback(async (fileId) => {
    await deleteFile(fileId);
    setFiles(prev => prev.filter(f => (f._id || f.id) !== fileId));
    setTotal(t => Math.max(0, t - 1));
  }, []);

  const rename = useCallback((fileId, newName) => {
    setFiles(prev => prev.map(f => {
      if ((f._id || f.id) === fileId) {
        return { ...f, original_filename: newName };
      }
      return f;
    }));
  }, []);

  return { files, total, loading, error, refetch: fetchFiles, remove, rename };
}

export function useRecentFiles(limit = 5) {
  return useFiles({ limit, sort: 'created_at', order: 'desc' });
}
