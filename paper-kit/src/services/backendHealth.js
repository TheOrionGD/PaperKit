/* backendHealth.js — Resilient Backend Health & Dual-Service Render Cold-Start Poller */

export const RENDER_BACKEND_URL = import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com';
export const RENDER_WEB_URL = import.meta.env.VITE_WEB_URL || 'https://paperkit-web.onrender.com';
export const API_BASE = RENDER_BACKEND_URL;

/**
 * Checks if a specific URL is responsive.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ ok: boolean, status?: number, data?: any, error?: string }>}
 */
export async function pingUrl(url, timeoutMs = 5000) {
  const isWebUrl = url.includes('paperkit-web.onrender.com');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      mode: isWebUrl ? 'no-cors' : 'cors',
      headers: isWebUrl ? undefined : { 'Accept': 'application/json, text/html, */*' },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (isWebUrl) {
      return { ok: true, status: 200 };
    }

    if (response.ok || (response.status >= 200 && response.status < 400)) {
      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      }
      return { ok: true, status: response.status, data };
    }
    return { ok: false, status: response.status };
  } catch (err) {
    return { ok: false, error: err.message || 'Connection failed' };
  }
}

/**
 * Probes the backend API across candidate endpoints (configured API base & Render backend).
 * @param {string} [baseUrl=API_BASE]
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ ok: boolean, activeUrl?: string, data?: any, status?: number }>}
 */
export async function pingBackend(baseUrl = API_BASE, timeoutMs = 5000) {
  const candidateBases = Array.from(new Set([
    baseUrl.replace(/\/+$/, ''),
    RENDER_BACKEND_URL.replace(/\/+$/, ''),
  ]));

  for (const base of candidateBases) {
    const probeEndpoints = [
      `${base}/health`,
      `${base}/`,
    ];

    for (const url of probeEndpoints) {
      const res = await pingUrl(url, timeoutMs);
      if (res.ok) {
        return { ok: true, activeUrl: base, data: res.data, status: res.status };
      }
    }
  }

  return { ok: false, error: 'Backend API unreachable' };
}

/**
 * Probes both onrender.com URLs (Backend API & Web App) simultaneously.
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ backendOk: boolean, webOk: boolean, backendData?: any }>}
 */
export async function probeBothRenderServices(timeoutMs = 5000) {
  const [backendRes, webRes] = await Promise.allSettled([
    pingBackend(API_BASE, timeoutMs),
    pingUrl(RENDER_WEB_URL, timeoutMs),
  ]);

  return {
    backendOk: backendRes.status === 'fulfilled' && backendRes.value.ok,
    webOk: webRes.status === 'fulfilled' && webRes.value.ok,
    backendData: backendRes.status === 'fulfilled' ? backendRes.value.data : null,
  };
}

/**
 * Polls the backend until responsive (waking up Render free-tier instances).
 * Reports real-time status and cold-start elapsed time.
 *
 * @param {Object} options
 * @param {string} [options.backendUrl]
 * @param {number} [options.maxWaitMs=70000] (70 seconds timeout for Render cold starts)
 * @param {number} [options.pollIntervalMs=2500]
 * @param {(state: { stage: string, message: string, elapsedSeconds: number, isWakingUp: boolean, services: { backend: boolean, web: boolean } }) => void} [options.onProgress]
 * @returns {Promise<{ success: boolean, elapsedMs: number, services: { backend: boolean, web: boolean }, error?: string }>}
 */
export async function waitForBackendReady({
  backendUrl = API_BASE,
  maxWaitMs = 70000,
  pollIntervalMs = 2500,
  onProgress = () => {},
} = {}) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const isWakingUp = elapsedSeconds > 3;

    let message = 'Loading PaperKit services...';
    let stage = 'connecting';

    if (elapsedSeconds >= 3 && elapsedSeconds < 12) {
      message = 'Connecting to backend services...';
      stage = 'connecting';
    } else if (elapsedSeconds >= 12 && elapsedSeconds < 30) {
      message = 'Loading workspace engines...';
      stage = 'loading';
    } else if (elapsedSeconds >= 30) {
      message = 'Preparing document tools...';
      stage = 'loading';
    }

    // Ping both services in parallel to warm both Render instances
    const [backendResult, webResult] = await Promise.all([
      pingBackend(backendUrl, 4500),
      pingUrl(RENDER_WEB_URL, 4500),
    ]);

    const services = {
      backend: backendResult.ok,
      web: webResult.ok,
    };

    onProgress({ stage, message, elapsedSeconds, isWakingUp, services });

    if (backendResult.ok) {
      onProgress({
        stage: 'ready',
        message: 'Services online! Loading workspace...',
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
        isWakingUp: false,
        services,
      });
      return { success: true, elapsedMs: Date.now() - startTime, services };
    }

    // Wait before next probe
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    success: false,
    elapsedMs: Date.now() - startTime,
    services: { backend: false, web: false },
    error: 'Render backend took longer than expected to wake up.',
  };
}
