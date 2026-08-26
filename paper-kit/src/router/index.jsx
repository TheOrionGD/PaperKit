/* Router — all app routes using React Router v6 */
import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingState from '../components/ui/LoadingState';
import AppShell from '../components/layout/AppShell';
import SplashScreen from '../components/ui/SplashScreen';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { waitForBackendReady } from '../services/backendHealth';

/* Minimum splash display time (ms) for a branded launch experience */
const MIN_SPLASH_MS = 1200;

/* Lazy-loaded screens */
const HomeScreen       = lazy(() => import('../screens/HomeScreen'));
const AllToolsScreen   = lazy(() => import('../screens/AllToolsScreen'));
const ScannerScreen    = lazy(() => import('../screens/ScannerScreen'));
const FilesScreen      = lazy(() => import('../screens/FilesScreen'));
const ProfileScreen    = lazy(() => import('../screens/ProfileScreen'));
const AIToolsScreen    = lazy(() => import('../screens/AIToolsScreen'));
const HistoryScreen    = lazy(() => import('../screens/HistoryScreen'));
const StorageScreen    = lazy(() => import('../screens/StorageScreen'));
const LandingScreen    = lazy(() => import('../screens/welcome/LandingScreen'));
const OnboardingScreen = lazy(() => import('../screens/welcome/OnboardingScreen'));
const HelpScreen       = lazy(() => import('../screens/HelpScreen'));
const AboutScreen      = lazy(() => import('../screens/AboutScreen'));
const NotFoundScreen   = lazy(() => import('../screens/NotFoundScreen'));

/* Dedicated Tool screens */
const EditPDFScreen         = lazy(() => import('../screens/tools/EditPDFScreen'));
const MergePDFScreen        = lazy(() => import('../screens/tools/MergePDFScreen'));
const SplitPDFScreen        = lazy(() => import('../screens/tools/SplitPDFScreen'));
const CompressPDFScreen     = lazy(() => import('../screens/tools/CompressPDFScreen'));
const ConvertScreen         = lazy(() => import('../screens/tools/ConvertScreen'));
const RotatePDFScreen       = lazy(() => import('../screens/tools/RotatePDFScreen'));
const WatermarkScreen       = lazy(() => import('../screens/tools/WatermarkScreen'));
const OrganizePDFScreen     = lazy(() => import('../screens/tools/OrganizePDFScreen'));
const ExtractPagesScreen    = lazy(() => import('../screens/tools/ExtractPagesScreen'));
const RemovePagesScreen     = lazy(() => import('../screens/tools/RemovePagesScreen'));
const ReorderPagesScreen    = lazy(() => import('../screens/tools/ReorderPagesScreen'));
const DuplicatePagesScreen  = lazy(() => import('../screens/tools/DuplicatePagesScreen'));
const PDFToPDFAScreen       = lazy(() => import('../screens/tools/PDFToPDFAScreen'));
const ImageConverterScreen  = lazy(() => import('../screens/tools/ImageConverterScreen'));
const ImageCompressorScreen = lazy(() => import('../screens/tools/ImageCompressorScreen'));
const MediaDownloaderScreen = lazy(() => import('../screens/tools/MediaDownloaderScreen'));
const AudioConverterScreen  = lazy(() => import('../screens/tools/AudioConverterScreen'));
const VideoConverterScreen  = lazy(() => import('../screens/tools/VideoConverterScreen'));
const VideoCompressorScreen = lazy(() => import('../screens/tools/VideoCompressorScreen'));

/* AI tool screens */
const SummarizePDFScreen    = lazy(() => import('../screens/ai/SummarizePDFScreen'));
const AskPDFScreen          = lazy(() => import('../screens/ai/AskPDFScreen'));
const TranslatePDFScreen    = lazy(() => import('../screens/ai/TranslatePDFScreen'));
const ExtractTablesScreen   = lazy(() => import('../screens/ai/ExtractTablesScreen'));
const OCRScreen             = lazy(() => import('../screens/ai/OCRScreen'));
const SemanticCompareScreen = lazy(() => import('../screens/ai/SemanticCompareScreen'));
const SimilarityMatrixScreen= lazy(() => import('../screens/ai/SimilarityMatrixScreen'));
const SemanticSearchScreen  = lazy(() => import('../screens/ai/SemanticSearchScreen'));
const ClassifyPDFScreen     = lazy(() => import('../screens/ai/ClassifyPDFScreen'));
const ExtractInfoScreen     = lazy(() => import('../screens/ai/ExtractInfoScreen'));
const WritingAssistantScreen= lazy(() => import('../screens/ai/WritingAssistantScreen'));
const QualityCheckerScreen  = lazy(() => import('../screens/ai/QualityCheckerScreen'));
const ImageEnhancerScreen   = lazy(() => import('../screens/ai/ImageEnhancerScreen'));

/* Security & Privacy screens */
const ProtectPDFScreen      = lazy(() => import('../screens/tools/ProtectPDFScreen'));
const SmartRedactionScreen  = lazy(() => import('../screens/tools/SmartRedactionScreen'));
const DigitalSignatureScreen= lazy(() => import('../screens/tools/DigitalSignatureScreen'));
const MetadataScreen        = lazy(() => import('../screens/tools/MetadataScreen'));

export default function AppRouter() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [_backendReady, setBackendReady] = useState(false);
  const [_forceProceed, setForceProceed] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('paperkit_onboarding_done') !== 'true';
  });

  const [healthState, setHealthState] = useState({
    stage: 'connecting',
    statusMessage: 'Connecting to PaperKit Cloud...',
    isWakingUp: false,
    elapsedSeconds: 0,
    services: { backend: false, web: false },
    error: null,
  });

  const checkBackendHealth = useCallback(async () => {
    setHealthState(prev => ({ ...prev, error: null }));
    const res = await waitForBackendReady({
      maxWaitMs: 70000,
      pollIntervalMs: 2500,
      onProgress: ({ stage, message, elapsedSeconds, isWakingUp, services }) => {
        setHealthState({
          stage,
          statusMessage: message,
          elapsedSeconds,
          isWakingUp,
          services: services || { backend: false, web: false },
          error: null,
        });
      },
    });

    if (res.success) {
      setBackendReady(true);
    } else {
      setHealthState(prev => ({
        ...prev,
        error: res.error || 'Server connection timed out.',
      }));
    }
  }, []);

  /* Start health check and minimum display timer on mount */
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    checkBackendHealth();
    return () => clearTimeout(timer);
  }, [checkBackendHealth]);

  /* Dismiss splash when minimum display time elapses */
  useEffect(() => {
    if (minTimeElapsed && splashVisible && !fadeOut) {
      setFadeOut(true);
      const timer = setTimeout(() => setSplashVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, splashVisible, fadeOut]);

  /* Show 13-page Onboarding right after splash screen */
  if (splashVisible && !fadeOut) {
    return (
      <SplashScreen
        statusMessage={healthState.statusMessage}
        stage={healthState.stage}
        isWakingUp={healthState.isWakingUp}
        elapsedSeconds={healthState.elapsedSeconds}
        services={healthState.services}
        error={healthState.error}
        onRetry={checkBackendHealth}
        onProceedAnyway={() => {
          setForceProceed(true);
          setSplashVisible(false);
        }}
      />
    );
  }

  if (showOnboarding) {
    return (
      <Suspense fallback={<LoadingState text="Preparing Onboarding..." />}>
        <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
      </Suspense>
    );
  }

  return (
    <>
      {splashVisible && (
        <SplashScreen
          fadeOut={fadeOut}
          statusMessage={healthState.statusMessage}
          stage={healthState.stage}
          isWakingUp={healthState.isWakingUp}
          elapsedSeconds={healthState.elapsedSeconds}
          services={healthState.services}
          error={healthState.error}
          onRetry={checkBackendHealth}
          onProceedAnyway={() => setForceProceed(true)}
        />
      )}
      <ErrorBoundary>
        <Suspense fallback={<LoadingState text="Loading..." />}>
          <Routes>
            {/* Onboarding & welcome routes */}
            <Route path="/welcome" element={<LandingScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />

            {/* Core app routes — wrapped in AppShell */}
            <Route path="/" element={<AppShell><HomeScreen /></AppShell>} />
            <Route path="/tools" element={<AppShell headerProps={{ title: 'All Tools' }}><AllToolsScreen /></AppShell>} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/files" element={<AppShell><FilesScreen /></AppShell>} />
            <Route path="/profile" element={<AppShell><ProfileScreen /></AppShell>} />
            <Route path="/ai" element={<AppShell headerProps={{ title: 'AI Tools' }}><AIToolsScreen /></AppShell>} />
            <Route path="/history" element={<AppShell headerProps={{ title: 'Processing History' }}><HistoryScreen /></AppShell>} />
            <Route path="/storage" element={<AppShell headerProps={{ title: 'Storage Dashboard' }}><StorageScreen /></AppShell>} />
            <Route path="/help" element={<AppShell headerProps={{ title: 'Help & Support' }}><HelpScreen /></AppShell>} />
            <Route path="/about" element={<AppShell headerProps={{ title: 'About PaperKit' }}><AboutScreen /></AppShell>} />

            {/* PDF Tool routes */}
            <Route path="/tools/edit"            element={<AppShell headerProps={{ title: 'Edit PDF' }}><EditPDFScreen /></AppShell>} />
            <Route path="/tools/merge"           element={<AppShell headerProps={{ title: 'Merge PDF', rightAction: 'check' }}><MergePDFScreen /></AppShell>} />
            <Route path="/tools/split"           element={<AppShell headerProps={{ title: 'Split PDF' }}><SplitPDFScreen /></AppShell>} />
            <Route path="/tools/compress"        element={<AppShell headerProps={{ title: 'Compress PDF' }}><CompressPDFScreen /></AppShell>} />
            <Route path="/tools/convert"         element={<AppShell headerProps={{ title: 'Convert Document' }}><ConvertScreen /></AppShell>} />
            <Route path="/tools/rotate"          element={<AppShell headerProps={{ title: 'Rotate PDF' }}><RotatePDFScreen /></AppShell>} />
            <Route path="/tools/watermark"       element={<AppShell headerProps={{ title: 'Watermark PDF' }}><WatermarkScreen /></AppShell>} />
            <Route path="/tools/organize-pages"  element={<AppShell headerProps={{ title: 'Organize Pages' }}><OrganizePDFScreen mode="organize" /></AppShell>} />
            <Route path="/tools/extract-pages"   element={<AppShell headerProps={{ title: 'Extract Pages' }}><ExtractPagesScreen /></AppShell>} />
            <Route path="/tools/remove-pages"    element={<AppShell headerProps={{ title: 'Remove Pages' }}><RemovePagesScreen /></AppShell>} />
            <Route path="/tools/reorder-pages"   element={<AppShell headerProps={{ title: 'Reorder Pages' }}><ReorderPagesScreen /></AppShell>} />
            <Route path="/tools/duplicate-pages" element={<AppShell headerProps={{ title: 'Duplicate Pages' }}><DuplicatePagesScreen /></AppShell>} />
            <Route path="/tools/pdf-to-pdfa"     element={<AppShell headerProps={{ title: 'PDF to PDF/A' }}><PDFToPDFAScreen /></AppShell>} />
            <Route path="/tools/image-converter" element={<AppShell headerProps={{ title: 'Image Converter' }}><ImageConverterScreen /></AppShell>} />
            <Route path="/tools/image-compressor" element={<AppShell headerProps={{ title: 'Image Compressor' }}><ImageCompressorScreen /></AppShell>} />
            <Route path="/tools/media-downloader" element={<AppShell headerProps={{ title: 'Media Downloader' }}><MediaDownloaderScreen /></AppShell>} />
            <Route path="/tools/audio-converter" element={<AppShell headerProps={{ title: 'Audio Converter' }}><AudioConverterScreen /></AppShell>} />
            <Route path="/tools/video-converter" element={<AppShell headerProps={{ title: 'Video Converter' }}><VideoConverterScreen /></AppShell>} />
            <Route path="/tools/video-compressor" element={<AppShell headerProps={{ title: 'Video Compressor' }}><VideoCompressorScreen /></AppShell>} />

            {/* AI tool routes */ }
            <Route path="/ai/ocr"                element={<AppShell headerProps={{ title: 'OCR Text Recognition' }}><OCRScreen /></AppShell>} />
            <Route path="/tools/ocr"             element={<AppShell headerProps={{ title: 'OCR Text Recognition' }}><OCRScreen /></AppShell>} />
            <Route path="/ai/summarize"          element={<AppShell headerProps={{ title: 'Summarize PDF' }}><SummarizePDFScreen /></AppShell>} />
            <Route path="/ai/compare"            element={<AppShell headerProps={{ title: 'Semantic Compare' }}><SemanticCompareScreen /></AppShell>} />
            <Route path="/ai/similarity"         element={<AppShell headerProps={{ title: 'Similarity Matrix' }}><SimilarityMatrixScreen /></AppShell>} />
            <Route path="/ai/ask"                element={<AppShell headerProps={{ title: 'Ask PDF' }}><AskPDFScreen /></AppShell>} />
            <Route path="/ai/search"             element={<AppShell headerProps={{ title: 'Semantic Search' }}><SemanticSearchScreen /></AppShell>} />
            <Route path="/ai/classify"           element={<AppShell headerProps={{ title: 'Document Classification' }}><ClassifyPDFScreen /></AppShell>} />
            <Route path="/ai/extract-info"       element={<AppShell headerProps={{ title: 'Information Extraction' }}><ExtractInfoScreen /></AppShell>} />
            <Route path="/ai/translate"          element={<AppShell headerProps={{ title: 'Translate PDF' }}><TranslatePDFScreen /></AppShell>} />
            <Route path="/ai/writing-assist"     element={<AppShell headerProps={{ title: 'AI Writing Assistant' }}><WritingAssistantScreen /></AppShell>} />
            <Route path="/ai/quality-checker"    element={<AppShell headerProps={{ title: 'Quality Checker' }}><QualityCheckerScreen /></AppShell>} />
            <Route path="/ai/extract-tables"     element={<AppShell headerProps={{ title: 'Extract Tables' }}><ExtractTablesScreen /></AppShell>} />
            <Route path="/ai/image-enhancer"     element={<AppShell headerProps={{ title: 'AI Image Enhancer' }}><ImageEnhancerScreen /></AppShell>} />

            {/* Security & Privacy routes */}
            <Route path="/security/protect"      element={<AppShell headerProps={{ title: 'Protect PDF' }}><ProtectPDFScreen /></AppShell>} />
            <Route path="/tools/protect"         element={<AppShell headerProps={{ title: 'Protect PDF' }}><ProtectPDFScreen /></AppShell>} />
            <Route path="/security/redact"       element={<AppShell headerProps={{ title: 'Redact Data' }}><SmartRedactionScreen /></AppShell>} />
            <Route path="/tools/redact"          element={<AppShell headerProps={{ title: 'Redact Data' }}><SmartRedactionScreen /></AppShell>} />
            <Route path="/security/sign"         element={<AppShell headerProps={{ title: 'Digital Signature' }}><DigitalSignatureScreen /></AppShell>} />
            <Route path="/tools/sign"            element={<AppShell headerProps={{ title: 'Digital Signature' }}><DigitalSignatureScreen /></AppShell>} />
            <Route path="/security/metadata"     element={<AppShell headerProps={{ title: 'Metadata Manager' }}><MetadataScreen /></AppShell>} />
            <Route path="/tools/metadata"        element={<AppShell headerProps={{ title: 'Metadata Manager' }}><MetadataScreen /></AppShell>} />

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
