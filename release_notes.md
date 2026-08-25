# PaperKit v1.3.5 — General Availability

**Release Date:** August 25, 2026
**Build:** `d815557` · **Platform:** Android (APK) · **Min SDK:** 22 · **Target SDK:** 35

---

PaperKit v1.3.5 marks the General Availability release of the PaperKit PDF & Media Studio Android application. This release delivers a production-ready Capacitor-based hybrid application backed by a FastAPI service layer, featuring a fully redesigned onboarding experience, offline-first authentication, a glassmorphic profile interface, and a stale-while-revalidate tools registry — all compiled against a signed release build configuration.

---

## What's New

### Guided Onboarding Flow (`OnboardingScreen`)

A new 13-page interactive onboarding experience (`OnboardingScreen.jsx` / `OnboardingScreen.css`) is now presented to first-time users immediately after the splash screen. The flow introduces PaperKit's core capability areas — PDF management, AI-powered processing, format conversion, and document security — through a swipeable, animated card sequence. On completion or skip, the onboarding state is dismissed and the main application shell is rendered. A dedicated `/onboarding` route is also registered for navigation-based re-entry.

**Technical notes:**
- Loaded via `React.lazy` with `Suspense` fallback to prevent bundle bloat.
- `showOnboarding` state is managed in the top-level `AppRouter` to gate route rendering.
- The `onFinish` callback collapses the onboarding gate and hands control to the authenticated session router.

---

### Offline-First Authentication (`auth.js`)

The authentication service has been refactored to support a fully offline-capable guest mode. When no JWT is present in `localStorage` (or the token is the sentinel value `guest_access_token`), `getMe()` now resolves immediately from a locally persisted profile object (`pk_user_profile`) without issuing a network request.

**Behavior matrix:**

| Condition | Resolution Strategy |
|---|---|
| Valid JWT present | Fetch from `/auth/me` (remote) |
| No token / `guest_access_token` | Read `pk_user_profile` from `localStorage` |
| `pk_user_profile` absent | Return synthetic default profile |

`updateMe()` applies the same branching: when in guest mode, profile mutations are applied directly to `localStorage` and returned synchronously, eliminating API round-trips entirely. On logout, both `pk_token` and `pk_user_profile` are cleared atomically.

**Default guest identity:**
- `_id`: `local_user`
- `name`: `Open Source User`
- `email`: `user@paperkit.local`

---

### Glassmorphic Profile UI (`ProfileScreen.jsx` / `ProfileScreen.css`)

The Profile screen has been fully rebuilt with a modern glassmorphic design language:

- **`ParticleBackground`** — A new dynamic floating particle canvas (`ParticleBackground.jsx`) renders across the entire profile surface and within the settings modal overlay, providing ambient visual depth.
- **Horizontal card layout** — The profile hero section now uses a horizontal flex layout (`profile-screen__card-hero-content`) composing the avatar, user details, and a quick-access settings button in a single cohesive row.
- **Inline verified badge** — The `UNRESTRICTED ACCESS` pill and registration date pill are now presented inline alongside the username within the hero card, replacing the previous stacked layout.
- **Quick-settings FAB** — A floating `Settings` icon button is anchored to the trailing edge of the hero card for one-tap access to the settings modal.
- **Settings modal particle layer** — `ParticleBackground` is also mounted inside the modal overlay, ensuring visual continuity between the profile page and its modal surface.

The CSS overhaul (`ProfileScreen.css`) introduces 209 new lines of declarations including `backdrop-filter: blur()` glass panels, CSS custom property tokens, and refined pill component styles.

---

### Stale-While-Revalidate Tools Registry (`tools.js`)

The tools service layer has been redesigned around a **stale-while-revalidate (SWR)** caching strategy to eliminate perceived latency on the `AllToolsScreen`:

- `getToolsRegistrySync()` — Synchronous accessor that returns the in-memory `cachedRegistry` or deserializes from `localStorage('pk_tools_registry')` in O(1) time.
- `getToolsRegistry()` — Async function that immediately resolves with the cached result (zero network latency) while concurrently dispatching a non-blocking background `GET /tools/registry` revalidation. On successful response, the in-memory cache and localStorage are updated atomically.
- `getProcessingHistory()` — Implements the same SWR pattern: local `pk_local_history` is returned immediately, then revalidated from `GET /tools/history` in the background.

A comprehensive `DEFAULT_REGISTRY` constant (30+ tool entries across PDF Management, Conversions, AI Tools, and Security categories) ensures the tools grid renders instantly even on first cold-start with no cached data.

---

### Splash Screen Decoupled from Backend Health (`router/index.jsx`)

The splash screen dismissal logic has been simplified. Previously, the splash persisted until both `minTimeElapsed` and `backendReady` (or `forceProceed`) were true, creating a blocking dependency on backend connectivity. The updated logic dismisses the splash exclusively based on `minTimeElapsed`, allowing the app to proceed immediately after the minimum display duration regardless of backend health status.

The "Proceed Anyway" path now also sets `setSplashVisible(false)` directly, eliminating the intermediate state dependency.

**Before:**
```
dismiss = (backendReady || forceProceed) && minTimeElapsed
```
**After:**
```
dismiss = minTimeElapsed
```

---

### PDF Edit Screen Refactor (`EditPDFScreen.jsx`)

The Edit PDF screen has been refactored for improved maintainability and state hygiene:
- Unused `setPreviewTarget` binding removed from destructuring (lint-compliant).
- 64 lines revised across the component to align with updated service API signatures.
- Flow control updated to consume the new offline-first `tools.js` service layer.

---

### Backend: Tools Router Enhancement (`Services/routers/tools.py`)

The FastAPI tools router has been extended with 7 additional lines to support supplementary tool endpoint surface area, ensuring the registry revalidation endpoint returns consistent data for the SWR cache refresh cycle.

---

### Vite Configuration Updates (`vite.config.js`)

8 lines updated in the Vite build configuration to align with the Capacitor hybrid build pipeline requirements for the v1.3.5 release artifact.

---

## Bug Fixes

- **`FilesScreen`** — Removed 2 redundant state references causing implicit re-renders on filter change.
- **`AppShell`** — Resolved layout shift caused by misaligned flex container in the navigation shell.
- **`FilePreviewModal`** — Corrected conditional rendering logic that caused the modal to mount with a stale file reference in certain navigation sequences.
- **`useFiles.js`** — Hook refactored with 35 additional lines to improve file list cache invalidation behavior and reduce unnecessary API calls on mount.
- **`backendHealth.js`** — Health check polling interval refined to reduce unnecessary wake-up requests against the Render cold-start backend.

---

## API Compatibility

| Endpoint | Method | Status |
|---|---|---|
| `/auth/me` | `GET` | Stable |
| `/auth/me` | `PUT` | Stable |
| `/tools/registry` | `GET` | Stable (SWR revalidation target) |
| `/tools/history` | `GET` | Stable (SWR revalidation target) |
| `/tools/merge` | `POST` | Stable |

---

## Dependency Versions

| Package | Version |
|---|---|
| `@capacitor/core` | `^8.5.0` |
| `@capacitor/android` | `^8.5.0` |
| `react` | `^19.2.8` |
| `react-router-dom` | `^7.18.2` |
| `pdf-lib` | `^1.17.1` |
| `pdfjs-dist` | `^6.2.108` |
| `lucide-react` | `^1.33.0` |
| `axios` | `^1.19.0` |
| `vite` | `^8.2.0` |

---

## Build Information

| Property | Value |
|---|---|
| Build Type | `assembleRelease` |
| Signing Config | `signingConfigs.debug` |
| Min SDK Version | 22 (Android 5.1 Lollipop) |
| Target SDK Version | 35 (Android 15) |
| Compile SDK Version | 35 |
| Version Code | `1` |
| Version Name | `1.3.5` |
| App ID | `com.theoriongd.paperkit` |
| Gradle Version | `8.14.3` |
| Build Tool | Capacitor CLI `^8.5.0` + Vite `^8.2.0` |
| Build Duration | 1m 43s |
| Artifact Size | ~20.8 MB |

---

## Installation

> **Prerequisite:** Enable *Install from Unknown Sources* in your Android device settings before sideloading.

1. Download `PaperKit-v1.3.5.apk` from the release assets below.
2. Transfer the APK to your Android device (Android 5.1 or later required).
3. Open the APK file on your device and follow the system installation prompts.
4. Launch **PaperKit** from your app drawer.

On first launch, the onboarding flow will guide you through the application's core features. No account creation is required — the application operates in guest mode by default with full local storage persistence.

---

## Known Limitations

- The release signing configuration uses the debug keystore (`signingConfigs.debug`). Production sideloading is fully functional; however, Play Store distribution requires migration to a dedicated release keystore.
- Backend-dependent features (AI tools, cloud sync) require connectivity to the PaperKit backend service hosted at `paperkit-backend.onrender.com`. Cold-start latency of up to 60 seconds may be observed on Render's free tier after periods of inactivity.
- Minification is disabled (`minifyEnabled false`) in this release to facilitate debugging and stack trace readability during the initial rollout phase.

---

## Repository

**Source:** https://github.com/TheOrionGD/PaperKit
**Branch:** `theoriongd` · **Commit:** `d815557`
**Backend Service:** https://paperkit-backend.onrender.com
