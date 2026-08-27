/* CategoryHubScreen.jsx — Dedicated hub page for all home page tool containers */
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Sparkles,
  FileText,
  Shield,
  RefreshCw,
  Archive,
  Image as ImageIcon,
  Video,
  Music,
  DownloadCloud,
  Search,
  CheckCircle2,
  Wrench
} from 'lucide-react';
import {
  PDF_TOOLS,
  AI_TOOLS,
  SECURITY_TOOLS,
  CONVERT_TOOLS,
  ARCHIVE_TOOLS,
  IMAGE_FORMAT_TOOLS,
  IMAGE_COMPRESS_TOOLS,
  VIDEO_FORMAT_TOOLS,
  VIDEO_COMPRESS_TOOLS,
  AUDIO_FORMAT_TOOLS,
  MEDIA_DOWNLOADER_TOOLS,
} from '../config/tools-config';
import { TOOL_ICON_MAP } from '../components/icons/ToolIcons';
import SearchBar from '../components/ui/SearchBar';
import './AIToolsScreen.css';
import './CategoryHubScreen.css';

const CATEGORY_DEFINITIONS = {
  pdf: {
    id: 'pdf',
    title: 'PDF Processing & Page Manager',
    subtitle: 'Edit, merge, split, compress, reorder, and permanently protect PDF documents with zero cloud uploads.',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    tools: PDF_TOOLS,
    statusText: 'Client-Side WASM PDF Core Active',
  },
  ai: {
    id: 'ai',
    title: 'AI Document Intelligence Suite',
    subtitle: 'Multimodal OCR, semantic comparison, document Q&A, translation & automated classification.',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
    tools: AI_TOOLS,
    statusText: 'Zero-Friction AI Intelligence Engine Active',
  },
  security: {
    id: 'security',
    title: 'Security & Privacy Suite',
    subtitle: 'AES-256 password encryption, permanent smart redaction, cryptographic digital signatures & metadata sanitization.',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    tools: SECURITY_TOOLS,
    statusText: 'Bank-Grade AES-256 Cryptographic Engine Ready',
  },
  convert: {
    id: 'convert',
    title: 'Document Conversions Studio',
    subtitle: 'Bidirectional document conversions between PDF, Word, Excel, PowerPoint, and high-resolution images.',
    icon: RefreshCw,
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    tools: CONVERT_TOOLS,
    statusText: 'Universal Document Conversion Pipeline Online',
  },
  archive: {
    id: 'archive',
    title: 'Archive & Compression Studio',
    subtitle: 'Extract, inspect, create, and convert .ZIP, .RAR, .TAR, .GZ, .7Z, and .BZ2 archives with multi-level compression.',
    icon: Archive,
    gradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    tools: ARCHIVE_TOOLS,
    statusText: 'High-Throughput Archive & Decompression Engine Active',
  },
  image: {
    id: 'image',
    title: 'Image Converter & Compressor Studio',
    subtitle: 'Convert between PNG, JPG, WebP, HEIC & BMP formats, plus multi-level lossless & lossy image compression.',
    icon: ImageIcon,
    gradient: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
    tools: [...IMAGE_FORMAT_TOOLS, ...IMAGE_COMPRESS_TOOLS],
    statusText: 'Hardware Accelerated Image Processing Ready',
  },
  video: {
    id: 'video',
    title: 'Video Conversion & Compression Suite',
    subtitle: 'Convert videos between MP4, WebM, MOV, and animated GIF formats with fast GPU-backed presets.',
    icon: Video,
    gradient: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
    tools: [...VIDEO_FORMAT_TOOLS, ...VIDEO_COMPRESS_TOOLS],
    statusText: 'Client-Side Media Transcoder Ready',
  },
  audio: {
    id: 'audio',
    title: 'Audio Format Converter Suite',
    subtitle: 'Convert audio files between MP3, WAV, and OGG with custom bitrate optimization.',
    icon: Music,
    gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
    tools: AUDIO_FORMAT_TOOLS,
    statusText: 'High-Fidelity Audio Processing Engine Online',
  },
  downloader: {
    id: 'downloader',
    title: 'Media Downloader Suite',
    subtitle: 'Extract and download media from YouTube and Spotify into high-quality MP4 and MP3 files.',
    icon: DownloadCloud,
    gradient: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
    tools: MEDIA_DOWNLOADER_TOOLS,
    statusText: 'Media Extraction Gateway Active',
  },
};

export default function CategoryHubScreen() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const category = useMemo(() => {
    const key = (categoryId || 'pdf').toLowerCase();
    return CATEGORY_DEFINITIONS[key] || CATEGORY_DEFINITIONS.pdf;
  }, [categoryId]);

  const IconComponent = category.icon;

  const filteredTools = useMemo(() => {
    if (!search.trim()) return category.tools;
    const q = search.toLowerCase();
    return category.tools.filter(t =>
      (t.label || t.name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }, [category.tools, search]);

  return (
    <div className="category-hub-screen ai-tools-screen">
      {/* Header Banner */}
      <div className="ai-tools-screen__banner category-hub-banner" style={{ background: category.gradient }}>
        <div className="ai-tools-screen__banner-icon category-hub-banner-icon">
          <IconComponent size={24} color="#fff" />
        </div>
        <div className="category-hub-banner-text">
          <h1 className="ai-tools-screen__banner-title">{category.title}</h1>
          <p className="ai-tools-screen__banner-sub">{category.subtitle}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="category-hub-search-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search ${category.title}...`}
          id={`search-category-${category.id}`}
        />
      </div>

      {/* Tool List */}
      <div className="ai-tools-screen__list category-hub-list">
        {filteredTools.map(tool => {
          const ToolIcon = TOOL_ICON_MAP[tool.id] || IconComponent;

          return (
            <button
              key={tool.id}
              className="ai-tool-card category-hub-card"
              onClick={() => navigate(tool.path)}
              id={`tool-hub-${tool.id}`}
            >
              <div className="category-hub-card__icon-wrap">
                {typeof ToolIcon === 'function' ? (
                  <ToolIcon size={44} />
                ) : (
                  <div className="category-hub-card__default-icon">
                    <IconComponent size={20} color="var(--color-primary)" />
                  </div>
                )}
              </div>
              <div className="ai-tool-card__content category-hub-card__content">
                <p className="ai-tool-card__title">{tool.label || tool.name}</p>
                <p className="ai-tool-card__desc">{tool.description || 'Open tool and start processing'}</p>
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" className="category-hub-card__chevron" />
            </button>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="category-hub-empty">
            <Search size={32} color="var(--color-text-muted)" />
            <p>No tools matched &quot;{search}&quot;</p>
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="ai-tools-screen__footer">
        <div className="ai-tools-screen__status-dot ai-tools-screen__status-dot--green" />
        <span className="ai-tools-screen__status-text">
          {category.statusText}
        </span>
      </div>
    </div>
  );
}
