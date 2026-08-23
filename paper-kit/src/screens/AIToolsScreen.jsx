/* AIToolsScreen — Live registry & config-driven AI Tools hub */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Sparkles, MessageSquare,
  Languages, TableProperties, Search, Scale,
  PieChart, Grid, Database, PenTool, ShieldCheck, Scan
} from 'lucide-react';
import { AI_TOOLS } from '../config/tools-config';
import './AIToolsScreen.css';

/* Icon map for AI tools by toolId */
const AI_ICONS = {
  'ai-ocr':            Scan,
  'summarize-pdf':     Sparkles,
  'semantic-compare':  Scale,
  'similarity-matrix': PieChart,
  'ask-pdf':           MessageSquare,
  'semantic-search':   Search,
  'classify-pdf':      Grid,
  'extract-info':      Database,
  'translate-pdf':     Languages,
  'writing-assistant': PenTool,
  'quality-checker':   ShieldCheck,
  'extract-tables':    TableProperties,
};

const COLOR_MAP = {
  'ai-ocr':            { bg: '#eff6ff', fg: '#2563eb' },
  'summarize-pdf':     { bg: '#f3f0ff', fg: '#7c3aed' },
  'semantic-compare':  { bg: '#fdf4ff', fg: '#9333ea' },
  'similarity-matrix': { bg: '#e0e7ff', fg: '#4f46e5' },
  'ask-pdf':           { bg: '#eff6ff', fg: '#2563eb' },
  'semantic-search':   { bg: '#f0fdfa', fg: '#0d9488' },
  'classify-pdf':      { bg: '#fef3c7', fg: '#d97706' },
  'extract-info':      { bg: '#fce7f3', fg: '#db2777' },
  'translate-pdf':     { bg: '#f0fdf4', fg: '#16a34a' },
  'writing-assistant': { bg: '#ecfdf5', fg: '#059669' },
  'quality-checker':   { bg: '#ccfbf1', fg: '#0f766e' },
  'extract-tables':    { bg: '#fff7ed', fg: '#ea580c' },
};

export default function AIToolsScreen() {
  const navigate = useNavigate();
  const [tools] = useState(AI_TOOLS);

  return (
    <div className="ai-tools-screen">
      {/* Header banner */}
      <div className="ai-tools-screen__banner">
        <div className="ai-tools-screen__banner-icon">
          <Sparkles size={22} color="#fff" />
        </div>
        <div>
          <p className="ai-tools-screen__banner-title">AI Document Intelligence Suite</p>
          <p className="ai-tools-screen__banner-sub">Multimodal OCR, Semantic Comparison, Document Q&amp;A &amp; Automated Classification</p>
        </div>
      </div>

      {/* Tool list */}
      <div className="ai-tools-screen__list">
        {tools.map(tool => {
          const Icon = AI_ICONS[tool.id] || Sparkles;
          const colors = COLOR_MAP[tool.id] || { bg: '#f3f0ff', fg: '#7c3aed' };

          return (
            <button
              key={tool.id}
              className="ai-tool-card"
              onClick={() => navigate(tool.path)}
              id={`ai-tool-${tool.id}`}
            >
              <div className="ai-tool-card__icon" style={{ background: colors.bg }}>
                <Icon size={24} color={colors.fg} />
              </div>
              <div className="ai-tool-card__content">
                <p className="ai-tool-card__title">{tool.label}</p>
                <p className="ai-tool-card__desc">{tool.description}</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </button>
          );
        })}
      </div>

      {/* Service status footer */}
      <div className="ai-tools-screen__footer">
        <div className="ai-tools-screen__status-dot ai-tools-screen__status-dot--green" />
        <span className="ai-tools-screen__status-text">
          Zero-Friction AI Intelligence Engine Active
        </span>
      </div>
    </div>
  );
}

