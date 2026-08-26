/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/purity */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  Cpu, Cloud, Server, Wifi, WifiOff, AlertTriangle, 
  Loader2, CheckCircle2, XCircle, Smartphone, Globe, Info, Sparkles 
} from 'lucide-react';
import { execute, determineRoute, DEFAULT_ROUTER_CONFIG } from '../services/processingRouter';
import './ProcessingOverlay.css';

const ProcessingContext = createContext(null);

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
}

export function ProcessingProvider({ children }) {
  // Load configuration from localStorage
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('pk_router_settings');
      return saved ? JSON.parse(saved) : DEFAULT_ROUTER_CONFIG;
    } catch {
      return DEFAULT_ROUTER_CONFIG;
    }
  });

  // Active execution state
  const [activeTask, setActiveTask] = useState(null); 
  /* 
    activeTask = {
      operationId: string,
      status: 'idle' | 'routing' | 'running' | 'completed' | 'failed',
      route: 'LOCAL' | 'BACKEND' | 'CLOUD' | null,
      reason: string | null,
      progress: number,
      statusText: string,
      error: string | null,
      result: any | null,
      logs: Array<{ time: string, msg: string }>,
      fileCount: number,
      totalSize: number
    }
  */

  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('pk_router_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const _addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    setActiveTask(prev => prev ? { ...prev, logs: [...prev.logs, { time, msg }] } : null);
  }, []);

  const runProcessing = useCallback(async (opOrConfig, inputs = {}, options = {}) => {
    // Dynamic task callback format: { jobType, title, task }
    if (typeof opOrConfig === 'object' && opOrConfig.task) {
      const { jobType = 'task', title = 'Processing Document...', task } = opOrConfig;
      const initialTask = {
        operationId: jobType,
        status: 'running',
        route: 'LOCAL',
        reason: 'Direct Engine Execution',
        progress: 15,
        statusText: title,
        error: null,
        result: null,
        logs: [{ time: new Date().toLocaleTimeString(), msg: `Initiating ${title}` }],
        fileCount: 1,
        totalSize: 0
      };
      setActiveTask(initialTask);

      const updateProgress = (pct, text) => {
        setActiveTask(prev => {
          if (!prev) return null;
          const logTime = new Date().toLocaleTimeString();
          return {
            ...prev,
            progress: pct,
            statusText: text || prev.statusText,
            logs: text ? [...prev.logs, { time: logTime, msg: text }] : prev.logs
          };
        });
      };

      try {
        const res = await task(updateProgress);
        setActiveTask(prev => prev ? {
          ...prev,
          status: 'completed',
          progress: 100,
          statusText: 'Operation completed successfully!',
          result: res,
          logs: [...prev.logs, { time: new Date().toLocaleTimeString(), msg: 'Job executed successfully.' }]
        } : null);
        return res;
      } catch (err) {
        const errMsg = err?.message || 'Processing failed';
        setActiveTask(prev => prev ? {
          ...prev,
          status: 'failed',
          error: errMsg,
          statusText: 'Processing failed.',
          logs: [...prev.logs, { time: new Date().toLocaleTimeString(), msg: `Error: ${errMsg}` }]
        } : null);
        throw err;
      }
    }

    const operationId = typeof opOrConfig === 'string' ? opOrConfig : (opOrConfig?.operationId || 'process');

    // Collect stats on inputs
    const filesList = [];
    for (const val of Object.values(inputs)) {
      if (val instanceof File) {
        filesList.push(val);
      } else if (Array.isArray(val)) {
        val.forEach(item => {
          if (item instanceof File) filesList.push(item);
        });
      }
    }
    const fileCount = filesList.length;
    const totalSize = filesList.reduce((sum, f) => sum + (f?.size || 0), 0);

    // Initial state
    const initialTask = {
      operationId,
      status: 'routing',
      route: null,
      reason: null,
      progress: 10,
      statusText: 'Connecting to processing service...',
      error: null,
      result: null,
      logs: [{ time: new Date().toLocaleTimeString(), msg: 'Dispatching service request...' }],
      fileCount,
      totalSize
    };

    setActiveTask(initialTask);


    try {
      // 1. Determine routing details
      const routeInfo = determineRoute(operationId, filesList, config);
      setActiveTask(prev => ({
        ...prev,
        route: routeInfo.route,
        reason: routeInfo.reason,
        statusText: `Routed to ${routeInfo.route} engine.`
      }));

      const time = new Date().toLocaleTimeString();
      initialTask.logs.push({ time, msg: `Routed to ${routeInfo.route} Engine. Reason: ${routeInfo.reason}` });

      if (routeInfo.route === 'LOCAL' && !routeInfo.allowed) {
        throw new Error(routeInfo.reason);
      }

      // 2. Execute
      const result = await execute(
        operationId,
        inputs,
        options,
        (progress) => {
          setActiveTask(prev => prev ? { ...prev, progress } : null);
        },
        (statusText) => {
          setActiveTask(prev => {
            if (!prev) return null;
            const logTime = new Date().toLocaleTimeString();
            return {
              ...prev,
              statusText,
              logs: [...prev.logs, { time: logTime, msg: statusText }]
            };
          });
        },
        config
      );

      // Auto-sync local output file to cloud storage & history database
      if (result) {
        const syncAsset = async (asset) => {
          try {
            let blobToUpload = asset.blob;
            if (!blobToUpload && asset.download_url && asset.download_url.startsWith('blob:')) {
              const res = await fetch(asset.download_url);
              blobToUpload = await res.blob();
            }
            if (blobToUpload) {
              const filename = asset.filename || `${operationId}_${Date.now()}.pdf`;
              const fileObj = new File([blobToUpload], filename, { type: blobToUpload.type || 'application/pdf' });
              const { uploadFile } = await import('../services/files');
              await uploadFile(fileObj);
            }
          } catch (err) {
            console.warn('Auto-syncing output to history failed:', err);
          }
        };

        if (Array.isArray(result)) {
          result.forEach(syncAsset);
        } else if (result.download_url) {
          syncAsset(result);
        }
      }

      setActiveTask(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        statusText: 'Processing completed successfully!',
        result,
        logs: [...prev.logs, { time: new Date().toLocaleTimeString(), msg: 'Job executed successfully. Output generated.' }]
      } : null);

      return result;
    } catch (err) {
      const errMsg = err.message || 'An unexpected error occurred during processing';
      setActiveTask(prev => prev ? {
        ...prev,
        status: 'failed',
        error: errMsg,
        statusText: 'Processing failed.',
        logs: [...prev.logs, { time: new Date().toLocaleTimeString(), msg: `Error: ${errMsg}` }]
      } : null);
      throw err;
    }
  }, [config]);

  const clearActiveTask = useCallback(() => {
    setActiveTask(null);
  }, []);

  return (
    <ProcessingContext.Provider value={{ config, updateConfig, activeTask, runProcessing, clearActiveTask }}>
      {children}
      {activeTask && (
        <ProcessingOverlay task={activeTask} onClose={clearActiveTask} config={config} />
      )}
    </ProcessingContext.Provider>
  );
}

function ProcessingOverlay({ task, onClose, config }) {
  const isCapacitor = !!window.Capacitor?.isNativePlatform?.();
  const isOnline = config.networkSim === 'offline' ? false : config.networkSim === 'online' ? true : navigator.onLine;

  const totalSizeMB = (task.totalSize / (1024 * 1024)).toFixed(2);

  const getRouteBadgeColor = () => {
    if (task.route === 'LOCAL') return 'local';
    if (task.route === 'BACKEND') return 'backend';
    if (task.route === 'CLOUD') return 'cloud';
    return 'routing';
  };

  const getStatusIcon = () => {
    if (task.status === 'completed') return <CheckCircle2 size={36} color="var(--color-success, #10B981)" className="bounce" />;
    if (task.status === 'failed') return <XCircle size={36} color="var(--color-danger, #EF4444)" className="shake" />;
    return <Loader2 size={36} color="var(--color-primary, #3B82F6)" className="spin" />;
  };

  const confettiPieces = useMemo(() => {
    if (task.status !== 'completed') return [];
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'];
    const shapes = [];
    for (let i = 0; i < 60; i++) {
      const size = Math.floor(Math.random() * 8) + 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = Math.random() * 2 + 2;
      const sway = Math.random() * 60 - 30;
      const opacity = Math.random() * 0.4 + 0.6;
      const bg = colors[Math.floor(Math.random() * colors.length)];
      shapes.push({
        id: i,
        style: {
          '--size': `${size}px`,
          '--left': `${left}%`,
          '--delay': `${delay}s`,
          '--duration': `${duration}s`,
          '--sway': `${sway}px`,
          '--opacity': opacity,
          '--bg': bg,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }
      });
    }
    return shapes;
  }, [task.status]);

  return (
    <div className="processing-overlay">
      <div className="processing-card">
        {task.status === 'completed' && (
          <div className="confetti-container">
            {confettiPieces.map(piece => (
              <div key={piece.id} className="confetti-piece" style={piece.style} />
            ))}
          </div>
        )}
        <div className="processing-card__header">
          <div className="processing-card__title-row">
            <h2 className="processing-card__title">Execution Engine Status</h2>
            {(task.status === 'completed' || task.status === 'failed') && (
              <button className="processing-card__close-btn" onClick={onClose}>✕</button>
            )}
          </div>
          <p className="processing-card__subtitle">Real-time Hybrid routing orchestration</p>
        </div>

        <div className="processing-card__body">
          {/* Engine Routing Decision Panel */}
          <div className="routing-decision-panel">
            <div className={`route-destination route-destination--${getRouteBadgeColor()}`}>
              <div className="route-destination__icon">
                {task.route === 'LOCAL' && <Cpu size={24} />}
                {task.route === 'BACKEND' && <Server size={24} />}
                {task.route === 'CLOUD' && <Cloud size={24} />}
                {!task.route && <Loader2 size={24} className="spin" />}
              </div>
              <div className="route-destination__info">
                <span className="route-destination__label">TARGET ENGINE</span>
                <span className="route-destination__value">
                  {task.route ? `${task.route} PROCESSING` : 'DECIDING ENGINE...'}
                </span>
              </div>
            </div>

            <div className="routing-factors">
              <div className="factor-item">
                <span className="factor-label">Platform</span>
                <span className="factor-val">
                  {isCapacitor ? (
                    <><Smartphone size={12} /> Powered by PaperKit App</>
                  ) : (
                    <><Globe size={12} /> Web Browser</>
                  )}
                </span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Network</span>
                <span className="factor-val">
                  {isOnline ? (
                    <><Wifi size={12} color="#10B981" /> Online</>
                  ) : (
                    <><WifiOff size={12} color="#EF4444" /> Offline</>
                  )}
                </span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Resource Size</span>
                <span className="factor-val">
                  {task.fileCount > 0 ? `${task.fileCount} File(s) · ${totalSizeMB} MB` : 'No file inputs'}
                </span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Local Engine</span>
                <span className="factor-val">
                  {config.engineSim === 'available' ? 'pdf-lib (Ready)' : 'Unavailable'}
                </span>
              </div>
            </div>

            {task.reason && (
              <div className="routing-reason-box">
                <Info size={14} className="routing-reason-icon" />
                <p className="routing-reason-text">{task.reason}</p>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-section__status-line">
              <div className="progress-status-container">
                {getStatusIcon()}
                <span className="progress-status-text">{task.statusText}</span>
              </div>
              <span className="progress-percent-text">{task.progress}%</span>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill progress-bar-fill--${getRouteBadgeColor()}`}
                style={{ width: `${task.progress}%` }} 
              />
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="terminal-console">
            <div className="terminal-header">
              <span className="terminal-title">Engine Execution Console Logs</span>
              <span className="terminal-badge">LIVE</span>
            </div>
            <div className="terminal-body">
              {task.logs.map((log, index) => (
                <div key={index} className="terminal-log-row">
                  <span className="terminal-time">[{log.time}]</span>
                  <span className="terminal-message">{log.msg}</span>
                </div>
              ))}
              {task.status === 'routing' && (
                <div className="terminal-log-row terminal-log-row--pending">
                  <span className="terminal-cursor">█</span> Evaluating local buffers...
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {task.error && (
            <div className="error-banner">
              <AlertTriangle size={18} className="error-banner__icon" />
              <div className="error-banner__content">
                <h4>Execution Halted</h4>
                <p>{task.error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="processing-card__footer">
          {task.status === 'completed' && (
            <button 
              className="processing-action-btn processing-action-btn--success"
              onClick={onClose}
            >
              Continue to File
            </button>
          )}
          {task.status === 'failed' && (
            <button 
              className="processing-action-btn processing-action-btn--danger"
              onClick={onClose}
            >
              Close and Try Again
            </button>
          )}
          {task.status !== 'completed' && task.status !== 'failed' && (
            <div className="processing-status-disclaimer">
              <Sparkles size={12} /> Keep app active while processing documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
