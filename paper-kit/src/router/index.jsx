/* Router — all app routes using React Router v6 */
import { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingState from '../components/ui/LoadingState';
import AppShell from '../components/layout/AppShell';
import SplashScreen from '../components/ui/SplashScreen';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

/* Minimum splash display time (ms) for a branded launch experience */
const MIN_SPLASH_MS = 1500;

/* Lazy-loaded screens */
const HomeScreen       = lazy(() => import('../screens/HomeScreen'));
const AllToolsScreen   = lazy(() => import('../screens/AllToolsScreen'));
const ScannerScreen    = lazy(() => import('../screens/ScannerScreen'));
const FilesScreen      = lazy(() => import('../screens/FilesScreen'));
const ProfileScreen    = lazy(() => import('../screens/ProfileScreen'));
const AIToolsScreen    = lazy(() => import('../screens/AIToolsScreen'));
const LoginScreen      = lazy(() => import('../screens/auth/LoginScreen'));
const RegisterScreen   = lazy(() => import('../screens/auth/RegisterScreen'));
const HistoryScreen    = lazy(() => import('../screens/HistoryScreen'));
const StorageScreen    = lazy(() => import('../screens/StorageScreen'));
const LandingScreen    = lazy(() => import('../screens/welcome/LandingScreen'));
const HelpScreen       = lazy(() => import('../screens/HelpScreen'));
const AboutScreen      = lazy(() => import('../screens/AboutScreen'));
const NotFoundScreen   = lazy(() => import('../screens/NotFoundScreen'));


/* Dedicated Tool screens */
const MergePDFScreen        = lazy(() => import('../screens/tools/MergePDFScreen'));
const SplitPDFScreen        = lazy(() => import('../screens/tools/SplitPDFScreen'));
const CompressPDFScreen     = lazy(() => import('../screens/tools/CompressPDFScreen'));
const ConvertScreen         = lazy(() => import('../screens/tools/ConvertScreen'));
const EditPDFScreen         = lazy(() => import('../screens/tools/EditPDFScreen'));
const RotatePDFScreen       = lazy(() => import('../screens/tools/RotatePDFScreen'));
const WatermarkScreen       = lazy(() => import('../screens/tools/WatermarkScreen'));
const OrganizePDFScreen     = lazy(() => import('../screens/tools/OrganizePDFScreen'));
const ExtractPagesScreen    = lazy(() => import('../screens/tools/ExtractPagesScreen'));
const RemovePagesScreen     = lazy(() => import('../screens/tools/RemovePagesScreen'));
const ReorderPagesScreen    = lazy(() => import('../screens/tools/ReorderPagesScreen'));
const DuplicatePagesScreen  = lazy(() => import('../screens/tools/DuplicatePagesScreen'));
const PDFToPDFAScreen       = lazy(() => import('../screens/tools/PDFToPDFAScreen'));
const RemoveBGScreen        = lazy(() => import('../screens/tools/RemoveBGScreen'));
const ExtractAudioScreen    = lazy(() => import('../screens/tools/ExtractAudioScreen'));
const ArchiveExtractScreen  = lazy(() => import('../screens/tools/ArchiveExtractScreen'));
const ImageToolsScreen      = lazy(() => import('../screens/tools/ImageToolsScreen'));
const VideoToolsScreen      = lazy(() => import('../screens/tools/VideoToolsScreen'));
const ArchiveToolsScreen    = lazy(() => import('../screens/tools/ArchiveToolsScreen'));

/* AI tool screens */
const SummarizePDFScreen = lazy(() => import('../screens/ai/SummarizePDFScreen'));
const AskPDFScreen       = lazy(() => import('../screens/ai/AskPDFScreen'));
const TranslatePDFScreen = lazy(() => import('../screens/ai/TranslatePDFScreen'));
const ExtractTablesScreen = lazy(() => import('../screens/ai/ExtractTablesScreen'));

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/welcome" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  const { loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  /* Start minimum display timer on mount */
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  /* Once auth + timer are both done, begin fade-out then hide */
  const readyToTransition = !loading && minTimeElapsed;

  useEffect(() => {
    if (readyToTransition && splashVisible && !fadeOut) {
      setFadeOut(true);
      const timer = setTimeout(() => setSplashVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [readyToTransition, splashVisible, fadeOut]);

  /* Block all routes until splash is done */
  if (!readyToTransition) {
    return <SplashScreen />;
  }

  return (
    <>
      {splashVisible && <SplashScreen fadeOut={fadeOut} />}
      <ErrorBoundary>
        <Suspense fallback={<LoadingState text="Loading..." />}>
          <Routes>
          {/* Onboarding & welcome routes */}
          <Route path="/welcome" element={<PublicOnly><LandingScreen /></PublicOnly>} />

          {/* Auth routes — no AppShell */}
          <Route path="/login" element={<PublicOnly><LoginScreen /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterScreen /></PublicOnly>} />

          {/* Protected routes — wrapped in AppShell */}
          <Route path="/" element={<RequireAuth><AppShell><HomeScreen /></AppShell></RequireAuth>} />
          <Route path="/tools" element={<RequireAuth><AppShell headerProps={{ title: 'All Tools' }}><AllToolsScreen /></AppShell></RequireAuth>} />
          <Route path="/scanner" element={<RequireAuth><ScannerScreen /></RequireAuth>} />
          <Route path="/files" element={<RequireAuth><AppShell><FilesScreen /></AppShell></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><AppShell><ProfileScreen /></AppShell></RequireAuth>} />
          <Route path="/ai" element={<RequireAuth><AppShell headerProps={{ title: 'AI Tools' }}><AIToolsScreen /></AppShell></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><AppShell headerProps={{ title: 'Processing History' }}><HistoryScreen /></AppShell></RequireAuth>} />
          <Route path="/storage" element={<RequireAuth><AppShell headerProps={{ title: 'Storage Dashboard' }}><StorageScreen /></AppShell></RequireAuth>} />
          <Route path="/help" element={<RequireAuth><AppShell headerProps={{ title: 'Help & Support' }}><HelpScreen /></AppShell></RequireAuth>} />
          <Route path="/about" element={<RequireAuth><AppShell headerProps={{ title: 'About PaperKit' }}><AboutScreen /></AppShell></RequireAuth>} />

          {/* Core Tool routes */ }
          <Route path="/tools/merge"           element={<RequireAuth><AppShell headerProps={{ title: 'Merge PDF', rightAction: 'check' }}><MergePDFScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/split"           element={<RequireAuth><AppShell headerProps={{ title: 'Split PDF' }}><SplitPDFScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/compress"        element={<RequireAuth><AppShell headerProps={{ title: 'Compress PDF' }}><CompressPDFScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/convert"         element={<RequireAuth><AppShell headerProps={{ title: 'Convert Document' }}><ConvertScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/edit"            element={<RequireAuth><AppShell headerProps={{ title: 'Edit PDF' }}><EditPDFScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/rotate"          element={<RequireAuth><AppShell headerProps={{ title: 'Rotate PDF' }}><RotatePDFScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/watermark"       element={<RequireAuth><AppShell headerProps={{ title: 'Watermark PDF' }}><WatermarkScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/organize-pages"  element={<RequireAuth><AppShell headerProps={{ title: 'Organize Pages' }}><OrganizePDFScreen mode="organize" /></AppShell></RequireAuth>} />
          <Route path="/tools/extract-pages"   element={<RequireAuth><AppShell headerProps={{ title: 'Extract Pages' }}><ExtractPagesScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/remove-pages"    element={<RequireAuth><AppShell headerProps={{ title: 'Remove Pages' }}><RemovePagesScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/reorder-pages"   element={<RequireAuth><AppShell headerProps={{ title: 'Reorder Pages' }}><ReorderPagesScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/duplicate-pages" element={<RequireAuth><AppShell headerProps={{ title: 'Duplicate Pages' }}><DuplicatePagesScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/pdf-to-pdfa"     element={<RequireAuth><AppShell headerProps={{ title: 'PDF to PDF/A' }}><PDFToPDFAScreen /></AppShell></RequireAuth>} />
          
          {/* Dedicated Media & Suite Routes */}
          <Route path="/tools/remove-bg"       element={<RequireAuth><AppShell headerProps={{ title: 'Remove Background' }}><RemoveBGScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/extract-audio"   element={<RequireAuth><AppShell headerProps={{ title: 'Extract Audio' }}><ExtractAudioScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/archive-extract" element={<RequireAuth><AppShell headerProps={{ title: 'Extract Archive' }}><ArchiveExtractScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/images"          element={<RequireAuth><AppShell headerProps={{ title: 'Image Tools' }}><ImageToolsScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/video"           element={<RequireAuth><AppShell headerProps={{ title: 'Video Tools' }}><VideoToolsScreen /></AppShell></RequireAuth>} />
          <Route path="/tools/archive"         element={<RequireAuth><AppShell headerProps={{ title: 'Archive Tools' }}><ArchiveToolsScreen /></AppShell></RequireAuth>} />

          {/* AI tool routes */}
          <Route path="/ai/summarize"          element={<RequireAuth><AppShell headerProps={{ title: 'Summarize PDF' }}><SummarizePDFScreen /></AppShell></RequireAuth>} />
          <Route path="/ai/ask"                element={<RequireAuth><AppShell headerProps={{ title: 'Ask PDF' }}><AskPDFScreen /></AppShell></RequireAuth>} />
          <Route path="/ai/translate"          element={<RequireAuth><AppShell headerProps={{ title: 'Translate PDF' }}><TranslatePDFScreen /></AppShell></RequireAuth>} />
          <Route path="/ai/extract-tables"     element={<RequireAuth><AppShell headerProps={{ title: 'Extract Tables' }}><ExtractTablesScreen /></AppShell></RequireAuth>} />

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </>
  );
}


