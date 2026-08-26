import { useState, useEffect, useCallback } from 'react';
import { listFiles, deleteFile, getCachedFiles } from '../services/files';

export function useFiles(params = {}) {
  const cachedInitial = getCachedFiles(params);
  const [files, setFiles] = useState(cachedInitial.items || []);
  const [total, setTotal] = useState(cachedInitial.total || 0);
  const [loading, setLoading] = useState(!cachedInitial.items?.length);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    // Only set loading to true if we have zero cached items
    if (!files.length) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await listFiles(params);
      if (data && Array.isArray(data.items)) {
        setFiles(data.items);
        setTotal(data.total || 0);
      }
    } catch (err) {
      if (!files.length) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]); // eslint-disable-line

  useEffect(() => {
    // Synchronously update with cached data when params change
    const updated = getCachedFiles(params);
    if (updated.items && updated.items.length > 0) {
      setFiles(updated.items);
      setTotal(updated.total);
      setLoading(false);
    }
    fetchFiles();
  }, [fetchFiles, JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

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
