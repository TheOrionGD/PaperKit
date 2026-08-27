import JSZip from 'jszip';

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Detect archive format by extension or magic header
 */
export function detectArchiveFormat(filename) {
  if (!filename) return 'zip';
  const name = filename.toLowerCase();
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tar.gz';
  if (name.endsWith('.tar.bz2') || name.endsWith('.tbz2')) return 'tar.bz2';
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.rar')) return 'rar';
  if (name.endsWith('.7z')) return '7z';
  if (name.endsWith('.tar')) return 'tar';
  if (name.endsWith('.gz')) return 'gz';
  if (name.endsWith('.bz2')) return 'bz2';
  return 'zip';
}

/**
 * Simple TAR parser in pure JS (standard 512 byte block POSIX/UStar)
 */
export function parseTar(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const files = [];
  let offset = 0;

  function readString(start, length) {
    let end = start;
    while (end < start + length && bytes[end] !== 0) {
      end++;
    }
    return new TextDecoder('utf-8').decode(bytes.subarray(start, end)).trim();
  }

  function readOctal(start, length) {
    const str = readString(start, length);
    if (!str) return 0;
    return parseInt(str, 8) || 0;
  }

  while (offset + 512 <= bytes.length) {
    // End of archive is marked by at least two consecutive zero-filled blocks
    const headerBlock = bytes.subarray(offset, offset + 512);
    const isZero = headerBlock.every(b => b === 0);
    if (isZero) break;

    const name = readString(offset, 100);
    if (!name) break;

    const size = readOctal(offset + 124, 12);
    const mtime = readOctal(offset + 136, 12);
    const typeflag = String.fromCharCode(bytes[offset + 156]);
    const isDir = typeflag === '5' || name.endsWith('/');

    const fileDataStart = offset + 512;
    const fileDataEnd = fileDataStart + size;

    if (fileDataEnd <= bytes.length) {
      const content = bytes.slice(fileDataStart, fileDataEnd);
      files.push({
        name,
        size,
        compressedSize: size,
        date: mtime ? new Date(mtime * 1000) : new Date(),
        isDir,
        getBlob: async () => new Blob([content], { type: 'application/octet-stream' }),
        getText: async () => new TextDecoder().decode(content),
      });
    }

    // Advance to next 512-byte boundary
    const blocks = Math.ceil(size / 512);
    offset += 512 + blocks * 512;
  }

  return files;
}

/**
 * Create a TAR archive in pure JS
 */
export function buildTar(fileList) {
  const blocks = [];

  function writeString(buffer, offset, str, length) {
    const encoded = new TextEncoder().encode(str);
    buffer.set(encoded.subarray(0, length), offset);
  }

  function writeOctal(buffer, offset, num, length) {
    const str = num.toString(8).padStart(length - 1, '0') + ' ';
    writeString(buffer, offset, str, length);
  }

  for (const item of fileList) {
    const data = item.data instanceof Uint8Array ? item.data : new Uint8Array(item.data);
    const header = new Uint8Array(512);
    const size = data.length;
    const mtime = Math.floor(Date.now() / 1000);

    // Name (0..100)
    writeString(header, 0, item.name, 100);
    // Mode (100..108)
    writeString(header, 100, '0000644 ', 8);
    // UID (108..116)
    writeString(header, 108, '0000000 ', 8);
    // GID (116..124)
    writeString(header, 116, '0000000 ', 8);
    // Size (124..136)
    writeOctal(header, 124, size, 12);
    // Mtime (136..148)
    writeOctal(header, 136, mtime, 12);
    // Typeflag (156)
    header[156] = 48; // '0' = regular file
    // Magic UStar (257..263)
    writeString(header, 257, 'ustar  ', 8);

    // Checksum calculation (148..156)
    // Fill checksum with spaces first
    for (let i = 148; i < 156; i++) header[i] = 32;
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    writeString(header, 148, checksum.toString(8).padStart(6, '0') + '\0 ', 8);

    blocks.push(header);
    blocks.push(data);

    // Padding to 512 bytes
    const padSize = (512 - (size % 512)) % 512;
    if (padSize > 0) {
      blocks.push(new Uint8Array(padSize));
    }
  }

  // End of archive marker (1024 zero bytes)
  blocks.push(new Uint8Array(1024));

  let totalLength = blocks.reduce((acc, b) => acc + b.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const b of blocks) {
    out.set(b, pos);
    pos += b.length;
  }

  return out;
}

/**
 * Inspect an archive file and list its files
 */
export async function inspectArchive(file) {
  const format = detectArchiveFormat(file.name);
  const arrayBuffer = await file.arrayBuffer();

  if (format === 'zip') {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = [];

    zip.forEach((relativePath, zipEntry) => {
      files.push({
        name: relativePath,
        size: zipEntry._data?.uncompressedSize || 0,
        compressedSize: zipEntry._data?.compressedSize || 0,
        date: zipEntry.date || new Date(),
        isDir: zipEntry.dir,
        getBlob: async () => {
          return await zipEntry.async('blob');
        },
        getText: async () => {
          return await zipEntry.async('text');
        },
      });
    });

    return {
      format: 'zip',
      filename: file.name,
      totalSize: file.size,
      files,
    };
  }

  if (format === 'tar') {
    const files = parseTar(arrayBuffer);
    return {
      format: 'tar',
      filename: file.name,
      totalSize: file.size,
      files,
    };
  }

  if (format === 'gz' || format === 'tar.gz') {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Response(new Blob([arrayBuffer])).body.pipeThrough(
          new DecompressionStream('gzip')
        );
        const decompressedBuffer = await new Response(stream).arrayBuffer();
        
        if (format === 'tar.gz') {
          const files = parseTar(decompressedBuffer);
          return {
            format: 'tar.gz',
            filename: file.name,
            totalSize: file.size,
            files,
          };
        } else {
          const baseName = file.name.replace(/\.gz$/i, '') || 'decompressed_file';
          return {
            format: 'gz',
            filename: file.name,
            totalSize: file.size,
            files: [
              {
                name: baseName,
                size: decompressedBuffer.byteLength,
                compressedSize: file.size,
                date: new Date(),
                isDir: false,
                getBlob: async () => new Blob([decompressedBuffer]),
                getText: async () => new TextDecoder().decode(decompressedBuffer),
              }
            ]
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback for RAR, 7Z, BZ2 or other container types
  return {
    format,
    filename: file.name,
    totalSize: file.size,
    files: [
      {
        name: file.name,
        size: file.size,
        compressedSize: file.size,
        date: new Date(),
        isDir: false,
        getBlob: async () => new Blob([arrayBuffer]),
        getText: async () => 'Binary archive content',
      }
    ]
  };
}

/**
 * Create a ZIP archive from multiple File/Blob objects
 */
export async function createZip(files, options = {}) {
  const { compressionLevel = 6, onProgress } = options;
  const zip = new JSZip();

  for (const item of files) {
    const name = item.name || 'file';
    const content = item instanceof File || item instanceof Blob ? item : item.content;
    zip.file(name, content);
  }

  const compression = compressionLevel > 0 ? 'DEFLATE' : 'STORE';
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression,
      compressionOptions: {
        level: compressionLevel,
      },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  return blob;
}

/**
 * Create a TAR archive
 */
export async function createTar(files) {
  const items = [];
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    items.push({
      name: file.name,
      data: new Uint8Array(arrayBuffer),
    });
  }
  const tarBytes = buildTar(items);
  return new Blob([tarBytes], { type: 'application/x-tar' });
}

/**
 * Create a TAR.GZ archive
 */
export async function createTarGz(files) {
  const tarBlob = await createTar(files);
  if (typeof CompressionStream !== 'undefined') {
    const stream = tarBlob.stream().pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
  }
  return tarBlob;
}
