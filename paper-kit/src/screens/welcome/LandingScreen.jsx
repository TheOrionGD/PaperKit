import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, ShieldCheck, Zap, Star, 
  ChevronDown, ChevronUp, FileText, Upload, CheckCircle2,
  Lock, Globe, Cpu, Search, Sliders, Play,
  ArrowLeft, MoreHorizontal, User
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './LandingScreen.css';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { t, lang, setLang, supportedLanguages } = useI18n();
  const [openFaq, setOpenFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Interactive Live Demo state on landing page
  const [demoFile, setDemoFile] = useState(null);
  const fileInputRef = useRef(null);

  const stats = [
    { value: '50,000+', label: t('files_processed_stat'), icon: FileText, color: '#2563EB' },
    { value: '< 2.4s', label: t('avg_latency_stat'), icon: Zap, color: '#059669' },
    { value: '20+', label: 'PDF Tools', icon: Cpu, color: '#7C3AED' },
    { value: '100%', label: t('private_wasm_stat'), icon: Lock, color: '#D97706' },
  ];

  const quickShowcaseTools = [
    { id: 'merge-pdf', name: 'Merge PDF', category: 'PDF', desc: 'Combine multiple files', path: '/tools/merge' },
    { id: 'compress-pdf', name: 'Compress PDF', category: 'PDF', desc: 'Reduce file size', path: '/tools/compress' },
    { id: 'ai-ask', name: 'Ask PDF AI', category: 'AI Intelligence', desc: 'Instant QA on docs', path: '/ai/ask' },
    { id: 'split-pdf', name: 'Split PDF', category: 'PDF', desc: 'Extract or split pages', path: '/tools/split' },
  ];

  const filteredShowcase = activeCategory === 'All' 
    ? quickShowcaseTools 
    : quickShowcaseTools.filter(item => item.category === activeCategory);

  const testimonials = [
    { 
      name: 'TheOrionGD', 
      role: 'Engineering Student', 
      content: 'The offline PDF compression and CAD report merging in PaperKit is insane. Cut our 180MB semester project submission down to 8MB in 2 seconds with zero formatting loss.', 
      rating: 5 
    },
    { 
      name: 'Aadhi', 
      role: 'Engineering Student', 
      content: 'The AI Table Extractor and formula analyzer made compiling lab manual datasets effortless. Essential toolkit for every college engineering student.', 
      rating: 5 
    },
    { 
      name: 'Mithrajit', 
      role: 'Engineering Student', 
      content: '100% private client-side processing with zero paywalls or subscriptions. Everything from ISO PDF/A conversion to document editing works seamlessly.', 
      rating: 5 
    }
  ];

  const faqs = [
    {
      q: t('faq1_q'),
      a: t('faq1_a')
    },
    {
      q: t('faq2_q'),
      a: t('faq2_a')
    },
    {
      q: t('faq3_q'),
      a: t('faq3_a')
    }
  ];

  function handleDemoSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setDemoFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2),
        type: file.type || 'Document'
      });
    }
  }

  function handleDemoAction(action) {
    if (action === 'compress') navigate('/tools/compress');
    else if (action === 'convert') navigate('/tools/convert');
    else navigate('/tools');
  }

  const currentLanguageObj = supportedLanguages.find(l => l.code === lang) || supportedLanguages[0];

  return (
    <div className="landing-screen">
      {/* Background Glows */}
      <div className="landing-screen__glow-1" />
      <div className="landing-screen__glow-2" />

      {/* Top Frosted Bar with Language Selector */}
      <header className="landing-screen__topbar">
        <div className="landing-screen__brand-pill">
          <img src="/icon-48.png" alt="PaperKit Logo" width="24" height="24" style={{ borderRadius: '6px' }} />
          <span className="landing-screen__brand-name">PaperKit</span>
          <span className="landing-screen__brand-tag">PDF Suite</span>
        </div>

        <div className="landing-screen__top-actions">
          <div className="landing-screen__lang-pill">
            <Globe size={14} color="#2563EB" />
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="landing-screen__lang-select"
              aria-label="Select Language"
              id="landing-language-selector"
            >
              {supportedLanguages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
            <span className="landing-screen__active-lang-code">{currentLanguageObj.flag}</span>
          </div>
          <button
            type="button"
            className="landing-screen__signin-btn"
            onClick={() => navigate('/')}
          >
            Open Studio
          </button>
        </div>
      </header>

      {/* Hero 3-Card Glassmorphic Suite */}
      <section className="landing-screen__suite-showcase">
        {/* Left Hero Card */}
        <div className="landing-glass-card landing-glass-card--left">
          <div className="landing-glass-card__top-pill">
            <span>Open Source PDF Studio ✦</span>
          </div>

          <div className="landing-glass-card__media-box">
            <img src="/landing-hero.jpg" alt="Calm Document Studio" className="landing-glass-card__bg-img" />
            <div className="landing-glass-card__play-btn" onClick={() => navigate('/')}>
              <Play size={18} fill="#0F172A" color="#0F172A" style={{ marginLeft: '2px' }} />
            </div>
          </div>

          <div className="landing-glass-card__bottom-copy">
            <h2 className="landing-glass-card__bold-title">
              {t('clear_speed_title').split('\n').map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </h2>
            <p className="landing-glass-card__muted-sub">{t('clear_speed_sub')}</p>
          </div>
        </div>

        {/* Center Discovery Card */}
        <div className="landing-glass-card landing-glass-card--center">
          <div className="landing-glass-card__search-pill" onClick={() => navigate('/tools')}>
            <Search size={15} color="#64748B" />
            <span className="landing-glass-card__search-ph">{t('find_tool_ph')}</span>
            <div className="landing-glass-card__avatar-dot">
              <User size={13} color="#334155" />
            </div>
          </div>

          <div className="landing-glass-card__heading-row">
            <div>
              <h3 className="landing-glass-card__section-title">{t('discover_title')}</h3>
              <p className="landing-glass-card__section-sub">{t('discover_sub')}</p>
            </div>
            <div className="landing-glass-card__icon-btn" onClick={() => navigate('/tools')}>
              <Sliders size={15} color="#64748B" />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="landing-glass-card__category-tabs">
            {[
              { id: 'All', label: t('tab_all') },
              { id: 'PDF', label: t('tab_pdf') },
              { id: 'AI Intelligence', label: t('tab_ai') },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`landing-glass-card__cat-pill ${activeCategory === cat.id ? 'landing-glass-card__cat-pill--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 2x2 Tool Grid */}
          <div className="landing-glass-card__tool-grid">
            {filteredShowcase.map((tool) => (
              <div
                key={tool.id}
                className="landing-glass-card__grid-item"
                onClick={() => navigate(tool.path)}
              >
                <div className="landing-glass-card__item-icon">
                  {tool.category === 'PDF' && <FileText size={20} color="#2563EB" />}
                  {tool.category === 'AI Intelligence' && <Sparkles size={20} color="#7C3AED" />}
                </div>
                <span className="landing-glass-card__item-name">{tool.name}</span>
                <span className="landing-glass-card__item-tag">{tool.desc}</span>
              </div>
            ))}
          </div>

          <div className="landing-glass-card__bottom-badge">
            <span>20+ PDF Tools Ready ✦</span>
          </div>
        </div>

        {/* Right Product Showcase Card */}
        <div className="landing-glass-card landing-glass-card--right">
          <div className="landing-glass-card__top-nav">
            <div className="landing-glass-card__circle-btn" onClick={() => navigate('/tools')}>
              <ArrowLeft size={14} color="#334155" />
            </div>
            <div className="landing-glass-card__circle-btn" onClick={() => navigate('/about')}>
              <MoreHorizontal size={14} color="#334155" />
            </div>
          </div>

          {/* Frosted Palette Dots */}
          <div className="landing-glass-card__palette-dots">
            <span className="landing-glass-card__dot landing-glass-card__dot--active" style={{ background: '#FFFFFF' }} />
            <span className="landing-glass-card__dot" style={{ background: '#94A3B8' }} />
            <span className="landing-glass-card__dot" style={{ background: '#3B82F6' }} />
            <span className="landing-glass-card__dot" style={{ background: '#10B981' }} />
            <span className="landing-glass-card__dot" style={{ background: '#F43F5E' }} />
            <span className="landing-glass-card__dot" style={{ background: '#0F172A' }} />
          </div>

          {/* Bottom Glass Panel */}
          <div className="landing-glass-card__feature-panel">
            <span className="landing-glass-card__feature-pill">PaperKit Studio</span>
            <h3 className="landing-glass-card__feature-title">
              {t('studio_speed_title').split('\n').map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </h3>

            <div className="landing-glass-card__tags-list">
              <div className="landing-glass-card__feature-tag">
                <ShieldCheck size={13} color="#10B981" />
                <span>{t('client_side_tag')}</span>
              </div>
              <div className="landing-glass-card__feature-tag">
                <Zap size={13} color="#F59E0B" />
                <span>{t('latency_tag')}</span>
              </div>
            </div>

            <button
              type="button"
              className="landing-glass-card__cta-button"
              onClick={() => navigate('/')}
            >
              <span>Launch Studio</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Factual Benchmarks & Metrics */}
      <section className="landing-screen__stats-section">
        <div className="landing-screen__stats-grid">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="landing-screen__stat-glass-card">
                <div className="landing-screen__stat-icon" style={{ color: s.color }}>
                  <Icon size={20} />
                </div>
                <div className="landing-screen__stat-value">{s.value}</div>
                <div className="landing-screen__stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Drag & Drop Demo Box */}
      <section className="landing-screen__demo-section">
        <div className="landing-screen__demo-glass-box" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleDemoSelect}
            style={{ display: 'none' }}
          />

          {!demoFile ? (
            <div className="landing-screen__demo-prompt">
              <div className="landing-screen__demo-orb">
                <Upload size={22} color="#2563EB" />
              </div>
              <h3 className="landing-screen__demo-title">{t('try_demo_title')}</h3>
              <p className="landing-screen__demo-sub">{t('try_demo_sub')}</p>
              <div className="landing-screen__demo-browse-pill">
                <span>{t('browse_doc_btn')}</span>
              </div>
            </div>
          ) : (
            <div className="landing-screen__demo-ready" onClick={e => e.stopPropagation()}>
              <div className="landing-screen__demo-file-info">
                <CheckCircle2 size={24} color="#10B981" />
                <div>
                  <div className="landing-screen__demo-file-name">{demoFile.name}</div>
                  <div className="landing-screen__demo-file-meta">{demoFile.size} MB • {t('ready_for_proc')}</div>
                </div>
              </div>

              <div className="landing-screen__demo-actions">
                <button
                  type="button"
                  className="landing-screen__demo-btn-primary"
                  onClick={() => handleDemoAction('compress')}
                >
                  <Zap size={15} />
                  <span>{t('compress_now_btn')}</span>
                </button>
                <button
                  type="button"
                  className="landing-screen__demo-btn-secondary"
                  onClick={() => handleDemoAction('convert')}
                >
                  <FileText size={15} />
                  <span>{t('convert_format_btn')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="landing-screen__reviews-section">
        <div className="landing-screen__reviews-header">
          <div className="landing-screen__stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} fill="#F59E0B" color="#F59E0B" />
            ))}
          </div>
          <h2 className="landing-screen__section-heading">{t('loved_by_students')}</h2>
        </div>

        <div className="landing-screen__reviews-list">
          {testimonials.map((tItem, idx) => (
            <div key={idx} className="landing-screen__review-glass-card">
              <p className="landing-screen__review-text">"{tItem.content}"</p>
              <div className="landing-screen__review-author">
                <span className="landing-screen__author-name">{tItem.name}</span>
                <span className="landing-screen__author-role">{tItem.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="landing-screen__faq-section">
        <h2 className="landing-screen__section-heading">{t('faq_heading')}</h2>
        <div className="landing-screen__faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="landing-screen__faq-glass-item">
                <button
                  type="button"
                  className="landing-screen__faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && <p className="landing-screen__faq-answer">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Glass Bottom Bar */}
      <div className="landing-screen__floating-bar">
        <button
          type="button"
          className="landing-screen__floating-cta"
          onClick={() => navigate('/')}
        >
          <span>Launch Studio</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
