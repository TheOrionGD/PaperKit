/* AIToolsScreen — Live registry-driven AI Tools hub */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Sparkles, MessageSquare,
  Languages, TableProperties, FileCode, AlertTriangle, RefreshCw
} from 'lucide-react';
import { getToolsRegistry } from '../services/tools';
import './AIToolsScreen.css';

/* Icon map for AI tools by toolId */
const AI_ICONS = {
  'summarize-pdf':   Sparkles,
  'ask-pdf':         MessageSquare,
  'translate-pdf':   Languages,
  'extract-tables':  TableProperties,
  'pdf-to-markdown': FileCode,
};

/* Route overrides for AI tools */
const ROUTE_MAP = {
  'summarize-pdf':   '/ai/summarize',
  'ask-pdf':         '/ai/ask',
  'translate-pdf':   '/ai/translate',
  'extract-tables':  '/ai/extract-tables',
  'pdf-to-markdown': '/ai/pdf-to-markdown',
};

const COLOR_MAP = {
  'summarize-pdf':   { bg: '#f3f0ff', fg: '#7c3aed' },
  'ask-pdf':         { bg: '#eff6ff', fg: '#2563eb' },
  'translate-pdf':   { bg: '#f0fdf4', fg: '#16a34a' },
  'extract-tables':  { bg: '#fff7ed', fg: '#ea580c' },
  'pdf-to-markdown': { bg: '#fdf4ff', fg: '#9333ea' },
};

export default function AIToolsScreen() {
  const navigate = useNavigate();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  async function loadRegistry() {
    setLoading(true);
    setFetchError(null);
    try {
      const all = await getToolsRegistry();
      const aiOnly = all.filter(t => t.category === 'AI Tools');
      setTools(aiOnly);
    } catch (err) {
      setFetchError(err.message || 'Failed to load AI tools');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRegistry(); }, []);

  if (loading) {
    return (
      <div className="ai-tools-screen ai-tools-screen--loading">
        <div className="ai-tools-screen__spinner" />
        <span>Loading AI tools…</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="ai-tools-screen ai-tools-screen--error">
        <AlertTriangle size={32} color="#dc2626" />
        <p>Failed to load AI tools</p>
        <span>{fetchError}</span>
        <button className="ai-tools-screen__retry-btn" onClick={loadRegistry} id="ai-tools-retry-btn">
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ai-tools-screen">
      {/* Header banner */}
      <div className="ai-tools-screen__banner">
        <div className="ai-tools-screen__banner-icon">
          <Sparkles size={22} color="#fff" />
        </div>
        <div>
          <p className="ai-tools-screen__banner-title">AI-Powered PDF Tools</p>
          <p className="ai-tools-screen__banner-sub">Powered by Gemini · Results processed server-side</p>
        </div>
      </div>

      {/* Tool list */}
      <div className="ai-tools-screen__list">
        {tools.map(tool => {
          const Icon = AI_ICONS[tool.toolId] || Sparkles;
          const colors = COLOR_MAP[tool.toolId] || { bg: '#f3f0ff', fg: '#7c3aed' };
          const route = ROUTE_MAP[tool.toolId] || tool.route;

          return (
            <button
              key={tool.toolId}
              className="ai-tool-card"
              onClick={() => navigate(route)}
              id={`ai-tool-${tool.toolId}`}
            >
              <div className="ai-tool-card__icon" style={{ background: colors.bg }}>
                <Icon size={24} color={colors.fg} />
              </div>
              <div className="ai-tool-card__content">
                <p className="ai-tool-card__title">{tool.name}</p>
                <p className="ai-tool-card__desc">{tool.description}</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </button>
          );
        })}
      </div>

      {/* Service status footer */}
      <div className="ai-tools-screen__footer">
        <div className={`ai-tools-screen__status-dot ${tools.some(t => t.availability?.available) ? 'ai-tools-screen__status-dot--green' : 'ai-tools-screen__status-dot--red'}`} />
        <span className="ai-tools-screen__status-text">
          {tools.every(t => t.availability?.available !== false)
            ? 'All AI services operational'
            : tools.some(t => t.availability?.available)
              ? 'Some AI services unavailable'
              : 'AI service unavailable — check GEMINI_API_KEY'}
        </span>
      </div>
    </div>
  );
}
