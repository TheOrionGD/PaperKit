# PaperKit v1.3.6 — Feature Expansion & Media Processing Suite

We are excited to announce the release of **PaperKit v1.3.6**! This release introduces comprehensive archive management capabilities, dedicated multimedia conversion & compression suites, new interactive swipe-stack UX, scanner improvements, and extensive performance enhancements across web and Android.

---

## 🚀 What's New in v1.3.6

### 📦 Archive Management Suite (`ArchiveToolScreen`)
- **Complete ZIP Archive Control**: Extract, browse, preview, and build ZIP files right inside PaperKit.
- **In-App File Explorer**: Browse compressed folder hierarchies with instant file size and metadata inspection.
- **Multi-Format Extraction**: Unpack archives directly to device storage or local workspaces.

### 🎬 Media & Audio Processing Engine
- **Video & Audio Converters**: Convert between common formats (MP4, MP3, WAV, AAC, WebM) on-device.
- **Smart Media Compression**: Reduce file sizes with customizable quality presets and bitrate controls.
- **Image Converter & Enhancer**: Support for WebP, PNG, JPEG, HEIC conversion, and AI-powered document image enhancement.
- **Media Downloader Hub**: Improved URL resolution and streaming flow for YouTube and web media extraction.

### 🧭 Category Hub & Re-architected Navigation
- **`CategoryHubScreen`**: Organized category-level navigation spanning PDF Documents, Conversions, Media, AI Tools, and Security.
- **Feature Tips Swipe Stack**: Interactive, swipeable card deck (`FeatureTipsSwipeStack`) providing quick tips, shortcuts, and feature highlights on the home feed.
- **Refined Navigation Drawer**: Smoother route transitions and categorized tool access.

### 📄 Scanner & PDF Suite Upgrades
- **Enhanced Document Scanner**: Multi-page scanning workflow with edge detection, camera tuning, and high-DPI PDF generation.
- **Optimized PDF Editing & Organization**: Refactored `EditPDFScreen` and `OrganizePDFScreen` with smoother reordering, rotation, page extraction, and duplication.
- **COEP / WASM Optimization**: Proper cross-origin header and worker handling for client-side processing engines.

---

## 🛠️ Enhancements & Bug Fixes

- **`ScannerScreen`**: Resolved orientation issues and camera stream lifecycle cleanup on unmount.
- **`MediaDownloaderScreen`**: Enhanced regex validation, timeout handling, and download progress tracking.
- **`EditPDFScreen`**: Cleaned up unneeded state bindings, streamlined memory consumption on large documents.
- **`OnboardingScreen`**: Polished onboarding steps, typography, animations, and high-DPI illustrations.
- **Playwright Test Suite**: Added end-to-end full system testing workflow (`full_system.spec.ts`) for continuous verification.

---

## 📱 Build & Distribution Info

| Property | Value |
|---|---|
| **Version Name** | `1.3.6` |
| **Version Code** | `136` |
| **Package ID** | `com.theoriongd.paperkit` |
| **Min Android SDK** | 22 (Android 5.1 Lollipop) |
| **Target Android SDK** | 35 (Android 15) |
| **Artifact** | `PaperKit-v1.3.6.apk` (~22.3 MB) |
| **Build Pipeline** | Capacitor 8.5.0 + Vite 8.2.1 + Gradle 8.14.3 |

---

## 📥 Installation Instructions

1. Download **`PaperKit-v1.3.6.apk`** from the Assets section below.
2. If prompted on your device, enable **"Install from Unknown Sources"** or **"Install unknown apps"**.
3. Open the APK and follow the installation prompt.
4. Launch PaperKit — no account or login required!

---

**Full Changelog**: https://github.com/TheOrionGD/PaperKit/compare/v1.3.5...v1.3.6
