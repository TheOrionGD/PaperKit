import { useState, useEffect, useCallback, useRef } from 'react';
import { getJob, cancelJob } from '../services/jobs';

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const POLL_INTERVAL = 1000; // 1 second

/**
 * useJob(jobId) — polls a job until it reaches a terminal state.
 *
 * Returns: { job, loading, error, cancel }
 *   job.status   — CREATED | VALIDATING | QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
 *   job.progress — 0-100
 */
export function useJob(jobId) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(!!jobId);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);



  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setJob(null);
    setError(null);
    
    const poll = async () => {
      try {
        const data = await getJob(jobId);
        setJob(data);
        setLoading(false);
        if (!TERMINAL.has(data.status)) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load job');
        setLoading(false);
      }
    };
    
    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await cancelJob(jobId);
      setJob(prev => prev ? { ...prev, status: 'CANCELLED' } : prev);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  }, [jobId]);

  return { job, loading, error, cancel };
}
