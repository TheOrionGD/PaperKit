import { useState, useCallback } from 'react';
import { uploadFile } from '../services/files';

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await uploadFile(file, pct => setProgress(pct));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}
