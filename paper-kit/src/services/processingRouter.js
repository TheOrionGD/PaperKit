import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import api from './api';
import { getFileDownloadUrl, uploadFile } from './files';
import * as toolsService from './tools';
import * as aiService from './ai';
import * as jobsService from './jobs';

// Default config
export const DEFAULT_ROUTER_CONFIG = {
  mode: 'auto', // auto | local | backend | cloud
  maxLocalSizeMB: 10,
  deviceCapability: 'high', // high | low
  networkSim: 'default', // default | offline | online
  engineSim: 'available', // available | unavailable
};

// Operation capability registry
// Maps operation to whether it supports LOCAL execution in our JS engine
const OP_CAPABILITIES = {
  'merge-pdf': { local: true, type: 'pdf', intensive: false },
  'split-pdf': { local: true, type: 'pdf', intensive: false },
  'rotate-pdf': { local: true, type: 'pdf', intensive: false },
  'watermark': { local: true, type: 'pdf', intensive: false },
  'organize-pages': { local: true, type: 'pdf', intensive: false },
  'compress-pdf': { local: false, type: 'pdf', intensive: true }, // compression is intensive, backend does it better
  'summarize-pdf': { local: false, type: 'ai', intensive: true },
  'ask-pdf': { local: false, type: 'ai', intensive: true },
  'translate-pdf': { local: false, type: 'ai', intensive: true },
  'extract-tables': { local: false, type: 'ai', intensive: true },
  'pdf-to-markdown': { local: false, type: 'ai', intensive: true },
  'convert': { local: false, type: 'convert', intensive: true },
  'image-ops': { local: false, type: 'image', intensive: false },
  'video-ops': { local: false, type: 'video', intensive: true },
  'archive-ops': { local: false, type: 'archive', intensive: true },
};

/**
 * Determine routing route: LOCAL | BACKEND | CLOUD
 */
export function determineRoute(operationId, fileSpecs = [], userConfig = {}) {
  const config = { ...DEFAULT_ROUTER_CONFIG, ...userConfig };
  const opMeta = OP_CAPABILITIES[operationId] || { local: false, intensive: true };

  // 1. Check offline/network status
  let isOnline = navigator.onLine;
  if (config.networkSim === 'offline') isOnline = false;
  if (config.networkSim === 'online') isOnline = true;

  // 2. Check engine availability
  const engineAvailable = config.engineSim === 'available';

  // 3. Check platform
  const isCapacitor = !!window.Capacitor?.isNativePlatform?.();

  // 4. Calculate total file size
  const totalSizeBytes = fileSpecs.reduce((sum, f) => sum + (f?.size || 0), 0);
  const totalSizeMB = totalSizeBytes / (1024 * 1024);

  // 5. Evaluate overrides
  if (config.mode === 'local') {
    if (!opMeta.local) {
      return { route: 'LOCAL', allowed: false, reason: `Operation ${operationId} does not support local execution.` };
    }
    return { route: 'LOCAL', allowed: true, reason: 'Forced local mode by user configuration.' };
  }
  if (config.mode === 'backend') {
    return { route: 'BACKEND', allowed: true, reason: 'Forced backend mode by user configuration.' };
  }
  if (config.mode === 'cloud') {
    return { route: 'CLOUD', allowed: true, reason: 'Forced cloud mode by user configuration.' };
  }

  // Offline constraint: Must run locally or fail
  if (!isOnline) {
    if (opMeta.local && engineAvailable) {
      return { route: 'LOCAL', allowed: true, reason: 'Offline mode: routing to local engine.' };
    } else {
      return { route: 'LOCAL', allowed: false, reason: 'Device is offline and operation requires backend/cloud processing.' };
    }
  }

  // Network is online. Determine route based on capability & file size.
  if (opMeta.local && engineAvailable) {
    // Check file size threshold
    const sizeThreshold = config.maxLocalSizeMB;
    if (totalSizeMB > sizeThreshold) {
      return {
        route: 'BACKEND',
        allowed: true,
        reason: `File size (${totalSizeMB.toFixed(2)}MB) exceeds local processing threshold (${sizeThreshold}MB).`
      };
    }

    // Check device capability
    if (config.deviceCapability === 'low' && totalSizeMB > 2) {
      return {
        route: 'BACKEND',
        allowed: true,
        reason: 'Low performance device: delegating files >2MB to backend to prevent memory exhaustion.'
      };
    }

    // Capacitor (Mobile app shell) - Mobile should use local processing when appropriate
    if (isCapacitor) {
      return {
        route: 'LOCAL',
        allowed: true,
        reason: 'Mobile platform detected: executing locally to save battery and network bandwidth.'
      };
    }

    // Default web client local execution
    return {
      route: 'LOCAL',
      allowed: true,
      reason: 'Local engine available and within safe operational file size limits.'
    };
  }

  // Fallback to Backend or Cloud based on category
  if (opMeta.type === 'ai') {
    return {
      route: 'CLOUD',
      allowed: true,
      reason: 'AI processing requires cloud models (Gemini API mediated by backend).'
    };
  }

  return {
    route: 'BACKEND',
    allowed: true,
    reason: 'Resource-intensive or unsupported local operation; executing on server-side nodes.'
  };
}

/**
 * Download file from backend if only a fileId is provided
 */
async function fetchFileArrayBuffer(fileOrId) {
  if (fileOrId instanceof File) {
    return await fileOrId.arrayBuffer();
  }
  
  // It's a fileId string, download it
  const fileId = fileOrId;
  const downloadUrl = await getFileDownloadUrl(fileId);
  const fullUrl = downloadUrl.startsWith('http')
    ? downloadUrl
    : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${downloadUrl}`;

  const response = await api.get(fullUrl, { responseType: 'arraybuffer' });
  return response.data;
}

/**
 * Local implementation of PDF tools
 */
export async function executeLocal(operationId, inputs, _options = {}, onProgress = () => {}) {
  onProgress(10);
  
  if (operationId === 'merge-pdf') {
    const { files } = inputs; // Array of File objects or fileId strings
    const mergedPdf = await PDFDocument.create();
    
    let current = 0;
    for (const file of files) {
      onProgress(Math.round(10 + (current / files.length) * 80));
      const arrayBuffer = await fetchFileArrayBuffer(file);
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
      current++;
    }
    
    onProgress(90);
    const bytes = await mergedPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    onProgress(100);
    return { download_url: url, size: bytes.length, filename: 'merged.pdf' };
  }

  if (operationId === 'split-pdf') {
    const { file, mode, pageRange, everyN, pages } = inputs;
    const arrayBuffer = await fetchFileArrayBuffer(file);
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const total = srcPdf.getPageCount();

    let targetIndices = [];

    if (mode === 'range' || mode === 'extract') {
      const rangeStr = mode === 'range' ? pageRange : pages;
      targetIndices = parsePageRange(rangeStr, total);
    } else if (mode === 'every') {
      // split first N pages as demo
      const n = Number(everyN) || 1;
      for (let i = 0; i < Math.min(n, total); i++) {
        targetIndices.push(i);
      }
    }

    if (targetIndices.length === 0) {
      throw new Error('No valid pages selected for split');
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcPdf, targetIndices);
    copiedPages.forEach(p => newPdf.addPage(p));
    
    onProgress(80);
    const bytes = await newPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    onProgress(100);
    return { download_url: url, size: bytes.length, filename: 'split.pdf' };
  }

  if (operationId === 'rotate-pdf') {
    const { file, degrees: rotDeg, targetPages } = inputs;
    const arrayBuffer = await fetchFileArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    
    const indices = targetPages || pages.map((_, i) => i);
    for (const idx of indices) {
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + rotDeg) % 360));
      }
    }
    
    onProgress(80);
    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    onProgress(100);
    return { download_url: url, size: bytes.length, filename: 'rotated.pdf' };
  }

  if (operationId === 'watermark') {
    const { file, text, size: fontSize = 30, rotation = 45, opacity = 0.3 } = inputs;
    const arrayBuffer = await fetchFileArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      // Draw standard semi-transparent overlay in the center
      page.drawText(text || 'WATERMARK', {
        x: width / 4,
        y: height / 2,
        size: Number(fontSize),
        font: helvetica,
        color: rgb(0.7, 0.7, 0.7),
        opacity: Number(opacity),
        rotate: degrees(Number(rotation)),
      });
    }
    
    onProgress(80);
    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    onProgress(100);
    return { download_url: url, size: bytes.length, filename: 'watermarked.pdf' };
  }

  if (operationId === 'organize-pages') {
    const { file, pageIndices, rotations } = inputs; // pageIndices is array of indices (0-based) in new order, rotations matches indexes
    const arrayBuffer = await fetchFileArrayBuffer(file);
    const srcPdf = await PDFDocument.load(arrayBuffer);
    
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
    copiedPages.forEach((p, idx) => {
      if (rotations && rotations[idx] !== undefined) {
        const currentRot = p.getRotation().angle;
        p.setRotation(degrees((currentRot + rotations[idx]) % 360));
      }
      newPdf.addPage(p);
    });
    
    onProgress(80);
    const bytes = await newPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    onProgress(100);
    return { download_url: url, size: bytes.length, filename: 'organized.pdf' };
  }

  throw new Error(`Local execution not implemented for: ${operationId}`);
}

// Helpers
function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) return [];
  const pages = new Set();
  const parts = rangeStr.split(',');
  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        const rStart = Math.min(start, end);
        const rEnd = Math.max(start, end);
        for (let i = rStart; i <= rEnd; i++) {
          if (i >= 1 && i <= maxPages) pages.add(i - 1);
        }
      }
    } else {
      const val = parseInt(part, 10);
      if (!isNaN(val)) {
        if (val >= 1 && val <= maxPages) pages.add(val - 1);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Execute server side operation, automatically uploading local files first if necessary
 */
async function executeRemote(route, operationId, inputs, options = {}, onProgress = () => {}, onStatus = () => {}) {
  // 1. Find if we have any raw File objects in inputs
  // If so, we need to upload them first!
  const fileParams = {};
  
  onStatus('Uploading resources to server...');
  onProgress(5);

  // We can scan inputs for File objects or array of Files
  for (const [key, val] of Object.entries(inputs)) {
    if (val instanceof File) {
      const uploadRes = await uploadFile(val, pct => {
        onProgress(Math.round(5 + (pct * 0.45))); // uploads occupy up to 50% of process
      });
      fileParams[key] = uploadRes._id || uploadRes.id;
    } else if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) {
      const uploadedIds = [];
      let currentIdx = 0;
      for (const f of val) {
        const uploadRes = await uploadFile(f, pct => {
          const stepPct = (currentIdx + (pct / 100)) / val.length;
          onProgress(Math.round(5 + (stepPct * 45)));
        });
        uploadedIds.push(uploadRes._id || uploadRes.id);
        currentIdx++;
      }
      fileParams[key] = uploadedIds;
    } else {
      fileParams[key] = val;
    }
  }

  onStatus('Processing on remote engine...');
  onProgress(55);

  let result;
  
  // Call the appropriate API
  if (operationId === 'merge-pdf') {
    result = await toolsService.mergePDF(fileParams.files, options);
  } else if (operationId === 'split-pdf') {
    const { file, ...rest } = fileParams;
    result = await toolsService.splitPDF(file, rest);
  } else if (operationId === 'compress-pdf') {
    const { file, quality } = fileParams;
    result = await toolsService.compressPDF(file, quality);
  } else if (operationId === 'rotate-pdf') {
    const { file, degrees: rotDeg, targetPages } = fileParams;
    result = await toolsService.rotatePDF(file, rotDeg, targetPages);
  } else if (operationId === 'watermark') {
    const { file, ...rest } = fileParams;
    result = await toolsService.addWatermark(file, rest);
  } else if (operationId === 'organize-pages') {
    const { file, pageIndices } = fileParams;
    result = await toolsService.organizePDF(file, pageIndices);
  } else if (operationId === 'summarize-pdf') {
    const { file, language } = fileParams;
    result = await aiService.summarizePDF(file, language);
  } else if (operationId === 'ask-pdf') {
    const { file, question } = fileParams;
    result = await aiService.askPDF(file, question);
  } else if (operationId === 'translate-pdf') {
    const { file, language } = fileParams;
    result = await aiService.translatePDF(file, language);
  } else if (operationId === 'extract-tables') {
    const { file } = fileParams;
    result = await aiService.extractTables(file);
  } else if (operationId === 'pdf-to-markdown') {
    const { file } = fileParams;
    result = await aiService.pdfToMarkdown(file);
  } else if (operationId === 'convert') {
    const { file, fromFormat, toFormat } = fileParams;
    result = await toolsService.convertFile(file, fromFormat, toFormat, options);
  } else if (operationId.startsWith('image-')) {
    result = await jobsService.runImageOp(operationId.replace('image-', ''), fileParams.file, options);
  } else if (operationId.startsWith('video-')) {
    result = await jobsService.runVideoOp(operationId.replace('video-', ''), fileParams.file || fileParams.files, options);
  } else if (operationId.startsWith('archive-')) {
    result = await jobsService.runArchiveOp(operationId.replace('archive-', ''), fileParams.file || fileParams.files, options);
  } else {
    throw new Error(`Unsupported remote operation: ${operationId}`);
  }

  onProgress(100);
  return {
    ...result,
    _fileParams: fileParams
  };
}

/**
 * Unified execution entrypoint. Orchestrates route decision and runner selection.
 */
export async function execute(operationId, inputs, options = {}, onProgress = () => {}, onStatus = () => {}, userConfig = {}) {
  // Collect files to measure size
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

  onStatus('Analyzing resources & determining route...');
  const routing = determineRoute(operationId, filesList, userConfig);
  
  if (routing.route === 'LOCAL' && !routing.allowed) {
    throw new Error(`Routing Failure: ${routing.reason}`);
  }

  onStatus(`Executing operation on ${routing.route} Engine...`);
  
  const executionDetails = {
    route: routing.route,
    reason: routing.reason
  };

  try {
    let result;
    if (routing.route === 'LOCAL') {
      result = await executeLocal(operationId, inputs, options, onProgress);
    } else {
      result = await executeRemote(routing.route, operationId, inputs, options, onProgress, onStatus);
    }
    
    return {
      ...result,
      _routing: executionDetails
    };
  } catch (err) {
    console.error('Execution failed:', err);
    throw err;
  }
}
