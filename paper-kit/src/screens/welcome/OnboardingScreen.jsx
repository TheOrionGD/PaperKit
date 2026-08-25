import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Layers,
  Zap,
  MessageSquare,
  Table,
  ScanText,
  ShieldAlert,
  PenTool,
  Archive,
  Grid,
  Globe,
  Cpu,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2
} from 'lucide-react';
import ParticleBackground from '../../components/ui/ParticleBackground';
import './OnboardingScreen.css';

const ONBOARDING_PAGES = [
  {
    id: 1,
    badge: 'Welcome to PaperKit',
    title: 'Your Ultimate PDF & Document Studio',
    subtitle: 'All-in-one document intelligence, local WebAssembly tools, and deep AI capabilities built for modern workflows.',
    icon: Sparkles,
    iconColor: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    highlightColor: '#2563EB',
    features: [
      'Universal PDF processing suite with 20+ specialized tools',
      'Instant document conversion, compression, & editing',
      'Deep AI intelligence for summaries & Q&A analysis'
    ]
  },
  {
    id: 2,
    badge: '100% Private Processing',
    title: 'Offline Client-Side WASM Core',
    subtitle: 'Your documents never leave your browser memory. Processing runs locally on your device with complete privacy.',
    icon: ShieldCheck,
    iconColor: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    highlightColor: '#059669',
    features: [
      'Zero server upload requirement for standard PDF tools',
      'Bank-grade privacy for confidential & proprietary documents',
      'Lightning-fast execution directly on your CPU/GPU'
    ]
  },
  {
    id: 3,
    badge: 'Document Merging',
    title: 'Combine & Stack Multi-Format Files',
    subtitle: 'Merge hundreds of PDFs, CAD drawings, lab manuals, and image files into one structured document in seconds.',
    icon: Layers,
    iconColor: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.12)',
    highlightColor: '#7C3AED',
    features: [
      'Drag-and-drop page ordering & document stacking',
      'Preserve original bookmarks, vector fonts, and layout',
      'Instant preview before generating final compilation'
    ]
  },
  {
    id: 4,
    badge: 'Smart Compression',
    title: 'Reduce File Size up to 90%',
    subtitle: 'Intelligent vector and image compression shrinks heavy PDFs for quick email sharing and portal uploads.',
    icon: Zap,
    iconColor: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.12)',
    highlightColor: '#D97706',
    features: [
      'Multiple compression levels: Extreme, Recommended, & Light',
      'Retains sharp text and vector diagrams at high DPI',
      'Real-time estimated file size reduction preview'
    ]
  },
  {
    id: 5,
    badge: 'Ask PDF AI',
    title: 'Interactive AI Document Q&A',
    subtitle: 'Chat directly with long textbooks, research papers, and technical manuals with instant accurate page citations.',
    icon: MessageSquare,
    iconColor: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    highlightColor: '#2563EB',
    features: [
      'Context-aware answers with exact page reference quotes',
      'Multi-document chat for comparing multiple sources',
      'Export Q&A transcripts into study notes or summaries'
    ]
  },
  {
    id: 6,
    badge: 'AI Table Extraction',
    title: 'Convert Document Data to CSV/Excel',
    subtitle: 'Automatically detect and extract complex tables, lab datasets, and financial statements with zero manual typing.',
    icon: Table,
    iconColor: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    highlightColor: '#059669',
    features: [
      'Detects structured & unbordered table boundaries',
      'One-click export to clean CSV, JSON, or Excel sheets',
      'Automatic mathematical & numerical format validation'
    ]
  },
  {
    id: 7,
    badge: 'OCR Recognition',
    title: 'Turn Scans into Searchable Text',
    subtitle: 'High-precision optical character recognition converts paper scans and images into copyable, searchable text.',
    icon: ScanText,
    iconColor: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.12)',
    highlightColor: '#7C3AED',
    features: [
      'Multi-language OCR engine supporting 20+ languages',
      'Preserves original document layout and paragraphing',
      'Generates searchable PDF/A overlay layers'
    ]
  },
  {
    id: 8,
    badge: 'Smart Redaction',
    title: 'Permanent PII & Data Sanitization',
    subtitle: 'Blackout sensitive names, social security numbers, passwords, and addresses permanently before distribution.',
    icon: ShieldAlert,
    iconColor: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.12)',
    highlightColor: '#DC2626',
    features: [
      'Automated regex pattern scanning (Emails, SSNs, Phones)',
      'Destroys underlying vector text data — zero recovery',
      'Sanitizes hidden metadata & revision histories'
    ]
  },
  {
    id: 9,
    badge: 'Signatures & Watermarks',
    title: 'Digital Signing & Document Protection',
    subtitle: 'Add cryptographic signatures, visual stamp signatures, watermarks, and password encryption in seconds.',
    icon: PenTool,
    iconColor: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    highlightColor: '#2563EB',
    features: [
      'Draw, type, or upload custom e-signatures',
      'Custom text or image watermarks with opacity control',
      'AES-256 password protection & permission restriction'
    ]
  },
  {
    id: 10,
    badge: 'ISO PDF/A Archiving',
    title: 'Long-Term Preserved Compliance',
    subtitle: 'Convert standard documents into ISO 19005 compliant PDF/A format required for legal and government records.',
    icon: Archive,
    iconColor: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.12)',
    highlightColor: '#D97706',
    features: [
      'Embeds all fonts, color profiles, & metadata standards',
      'Ensures document renders identically 50 years from now',
      'Built-in compliance checking & validation report'
    ]
  },
  {
    id: 11,
    badge: 'Visual Page Organizer',
    title: 'Reorder, Rotate, Split & Duplicate',
    subtitle: 'Visual thumbnail grid lets you manage individual PDF pages with simple drag-and-drop actions.',
    icon: Grid,
    iconColor: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    highlightColor: '#059669',
    features: [
      'Rotate upside-down pages by 90°, 180°, or 270°',
      'Extract custom page ranges into standalone PDFs',
      'Delete blank pages or duplicate important slides'
    ]
  },
  {
    id: 12,
    badge: 'Multi-Language Compactability',
    title: 'Native Mobile & Offline App',
    subtitle: 'Full interface translation across 10+ languages with native desktop & mobile app experience via PWA.',
    icon: Globe,
    iconColor: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.12)',
    highlightColor: '#7C3AED',
    features: [
      'Seamless multi-language switching (English, Spanish, Hindi, etc.)',
      'Installable on Android, iOS, Windows & macOS',
      'Offline-first architecture — works without active internet'
    ]
  },
  {
    id: 13,
    badge: 'Cloud AI Intelligence',
    title: 'Deep Document Analytics & Cloud Engine',
    subtitle: 'Real-time cloud sync powers semantic document comparison, vector similarity matrices, and automatic classification.',
    icon: Cpu,
    iconColor: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    highlightColor: '#2563EB',
    features: [
      'Semantic document comparison highlighting hidden structural changes',
      'AI Document classification and auto-tagging system',
      'High-throughput vector search across massive document archives'
    ]
  }
];

export default function OnboardingScreen({ onFinish = null }) {
  const navigate = useNavigate();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const autoPlayTimerRef = useRef(null);

  const totalPages = ONBOARDING_PAGES.length;
  const currentPage = ONBOARDING_PAGES[currentSlideIndex];
  const IconComponent = currentPage.icon;
  const isLastPage = currentSlideIndex === totalPages - 1;

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  }, [totalPages]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('paperkit_onboarding_done', 'true');
    } catch {
      // Ignore storage error
    }
    if (onFinish) {
      onFinish();
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, onFinish]);

  /* Keyboard arrows navigation */
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (!isLastPage) handleNext();
        else handleFinish();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFinish, isLastPage]);

  /* Auto play handler */
  useEffect(() => {
    if (isPlaying && !isLastPage) {
      autoPlayTimerRef.current = setTimeout(() => {
        handleNext();
      }, 4000);
    } else if (isLastPage) {
      setIsPlaying(false);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isPlaying, currentSlideIndex, handleNext, isLastPage]);

  /* Touch Swiping */
  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (diffX > 40) {
      if (!isLastPage) handleNext();
    } else if (diffX < -40) {
      handlePrev();
    }
    setTouchStartX(null);
  }

  const progressPercent = Math.round(((currentSlideIndex + 1) / totalPages) * 100);

  return (
    <div
      className="onboarding-screen onboarding-screen--light-theme"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Animated Particle Background */}
      <ParticleBackground />

      {/* Background ambient lighting */}
      <div className="onboarding-screen__glow-1" style={{ background: currentPage.bgColor }} />
      <div className="onboarding-screen__glow-2" />

      {/* Top Bar */}
      <header className="onboarding-screen__topbar">
        <div className="onboarding-screen__brand">
          <img src="/icon-48.png" alt="PaperKit" width="28" height="28" style={{ borderRadius: '8px' }} />
          <span className="onboarding-screen__brand-title">PaperKit</span>
          <span className="onboarding-screen__page-pill">
            {currentSlideIndex + 1} / {totalPages}
          </span>
        </div>

        <div className="onboarding-screen__top-right-actions">
          <button
            type="button"
            className="onboarding-screen__autoplay-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause auto-slide' : 'Start auto-slide'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Auto'}</span>
          </button>

          {!isLastPage ? (
            <button
              type="button"
              className="onboarding-screen__skip-btn"
              onClick={() => setCurrentSlideIndex(totalPages - 1)}
            >
              Skip to End
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-screen__skip-btn"
              onClick={handleFinish}
            >
              Enter Studio
            </button>
          )}
        </div>
      </header>

      {/* Top Visual Progress Line */}
      <div className="onboarding-screen__progress-container">
        <div
          className="onboarding-screen__progress-bar"
          style={{
            width: `${progressPercent}%`,
            background: currentPage.highlightColor
          }}
        />
      </div>

      {/* Main Slide Card Container */}
      <main className="onboarding-screen__main">
        <div className="onboarding-screen__card" key={currentPage.id}>
          {/* Badge & Icon Header */}
          <div className="onboarding-screen__card-header">
            <div
              className="onboarding-screen__icon-orb"
              style={{
                backgroundColor: currentPage.bgColor,
                borderColor: `${currentPage.highlightColor}33`
              }}
            >
              <IconComponent size={38} color={currentPage.iconColor} />
            </div>

            <span
              className="onboarding-screen__badge"
              style={{
                color: currentPage.highlightColor,
                backgroundColor: currentPage.bgColor,
                borderColor: `${currentPage.highlightColor}40`
              }}
            >
              {currentPage.badge}
            </span>
          </div>

          {/* Slide Text Content */}
          <h2 className="onboarding-screen__title">{currentPage.title}</h2>
          <p className="onboarding-screen__subtitle">{currentPage.subtitle}</p>

          {/* Feature Bullets */}
          <div className="onboarding-screen__features-list">
            {currentPage.features.map((feat, idx) => (
              <div key={idx} className="onboarding-screen__feature-item">
                <CheckCircle2
                  size={18}
                  color={currentPage.highlightColor}
                  className="onboarding-screen__feature-icon"
                />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <footer className="onboarding-screen__footer">
        {/* Slide Dots Indicator */}
        <div className="onboarding-screen__dots">
          {ONBOARDING_PAGES.map((page, index) => (
            <button
              key={page.id}
              type="button"
              className={`onboarding-screen__dot ${index === currentSlideIndex ? 'onboarding-screen__dot--active' : ''
                }`}
              style={{
                backgroundColor:
                  index === currentSlideIndex
                    ? currentPage.highlightColor
                    : 'rgba(255, 255, 255, 0.2)'
              }}
              onClick={() => setCurrentSlideIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="onboarding-screen__nav-buttons">
          {currentSlideIndex > 0 && (
            <button
              type="button"
              className="onboarding-screen__nav-btn onboarding-screen__nav-btn--secondary"
              onClick={handlePrev}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
          )}

          {!isLastPage ? (
            <button
              type="button"
              className="onboarding-screen__nav-btn onboarding-screen__nav-btn--primary"
              style={{ backgroundColor: currentPage.highlightColor }}
              onClick={handleNext}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-screen__finish-btn"
              onClick={handleFinish}
              id="onboarding-enter-studio-btn"
            >
              <span>Get Started / Enter Studio</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
