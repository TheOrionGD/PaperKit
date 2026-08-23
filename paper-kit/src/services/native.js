import { Capacitor } from '@capacitor/core';

// Check if running inside Capacitor native shell
export const isNative = Capacitor.isNativePlatform();

/**
 * Native Haptic Feedback
 */
export async function triggerHaptic(type = 'light') {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (type === 'light') await Haptics.impact({ style: ImpactStyle.Light });
      else if (type === 'medium') await Haptics.impact({ style: ImpactStyle.Medium });
      else if (type === 'heavy') await Haptics.impact({ style: ImpactStyle.Heavy });
      else if (type === 'success') await Haptics.notification({ type: NotificationType.Success });
      else if (type === 'warning') await Haptics.notification({ type: NotificationType.Warning });
      else if (type === 'error') await Haptics.notification({ type: NotificationType.Error });
      else await Haptics.vibrate({ duration: 50 });
    } catch {
      // Haptics not available on current hardware
    }
  } else if ('vibrate' in navigator) {
    try {
      if (type === 'light') navigator.vibrate(15);
      else if (type === 'medium') navigator.vibrate(30);
      else if (type === 'heavy') navigator.vibrate(50);
      else if (type === 'success') navigator.vibrate([20, 50, 20]);
    } catch {
      // Ignore vibration error on unsupported web browsers
    }
  }
}

/**
 * Native Clipboard (Copy & Paste)
 */
export async function copyToClipboard(text) {
  if (isNative) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: text });
      await showNativeToast('Copied to clipboard!');
      return true;
    } catch (err) {
      console.warn('Native clipboard write failed:', err);
    }
  }
  
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Web clipboard write failed:', err);
    }
  }
  return false;
}

export async function readFromClipboard() {
  if (isNative) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      const { value } = await Clipboard.read();
      return value || '';
    } catch (err) {
      console.warn('Native clipboard read failed:', err);
    }
  }

  if (navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.warn('Web clipboard read failed:', err);
    }
  }
  return '';
}

/**
 * Native Toast Notification
 */
export async function showNativeToast(text, duration = 'short') {
  if (isNative) {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({
        text,
        duration: duration === 'long' ? 'long' : 'short',
        position: 'bottom'
      });
      return;
    } catch (err) {
      console.warn('Native toast failed:', err);
    }
  }
  console.log('[Toast]:', text);
}

/**
 * In-App Browser
 */
export async function openInAppBrowser(url) {
  if (isNative) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    } catch (err) {
      console.warn('In-app browser failed:', err);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Hide Native Splash Screen
 */
export async function hideSplashScreen() {
  if (isNative) {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (err) {
      console.warn('Failed to hide splash screen:', err);
    }
  }
}

/**
 * Exit / Close Application (Native App & Web Window)
 */
export async function exitApp() {
  if (isNative) {
    try {
      const { App } = await import('@capacitor/app');
      await App.exitApp();
      return;
    } catch (err) {
      console.warn('Native exitApp failed:', err);
    }
  }

  try {
    window.close();
  } catch (err) {
    console.warn('window.close failed:', err);
  }

  if (typeof window !== 'undefined') {
    window.location.href = 'about:blank';
  }
}

/**
 * Native Back Button Handler for Android
 */
export async function setupNativeBackButtonListener(onBack) {
  if (isNative) {
    try {
      const { App } = await import('@capacitor/app');
      const handler = await App.addListener('backButton', ({ canGoBack }) => {
        if (onBack) {
          onBack({ canGoBack });
        } else if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
      return () => handler.remove();
    } catch (err) {
      console.warn('Failed to register back button listener:', err);
    }
  }
  return () => {};
}

/**
 * Native Preferences (Key-Value Storage)
 */
export async function setSecurePreference(key, value) {
  const valStr = typeof value === 'string' ? value : JSON.stringify(value);
  if (isNative) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: valStr });
      return;
    } catch (err) {
      console.warn('Native preferences set failed:', err);
    }
  }
  localStorage.setItem(`pk_pref_${key}`, valStr);
}

export async function getSecurePreference(key) {
  if (isNative) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch (err) {
      console.warn('Native preferences get failed:', err);
    }
  }
  return localStorage.getItem(`pk_pref_${key}`);
}

/**
 * Native sharing (URLs/Text)
 */
export async function shareUrl(title, text, url) {
  if (isNative) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share via'
    });
  } else if (navigator.share) {
    await navigator.share({ title, text, url });
  } else {
    await copyToClipboard(url);
    alert('Link copied to clipboard!');
  }
}

/**
 * Utility: MIME type lookup by filename extension
 */
export function getMimeType(filename = '') {
  const ext = String(filename).split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'txt': return 'text/plain';
    case 'html': return 'text/html';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

/**
 * Native Storage Permissions helper for Capacitor Android/iOS
 */
export async function requestStoragePermissionsIfNeeded() {
  if (isNative) {
    try {
      const { Filesystem } = await import('@capacitor/filesystem');
      if (typeof Filesystem.checkPermissions === 'function') {
        const status = await Filesystem.checkPermissions();
        if (status.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      }
    } catch (err) {
      console.warn('Storage permission request warning:', err);
    }
  }
}

/**
 * Native file sharing
 */
export async function shareFile(fileUrl, filename, mimeType) {
  const resolvedMime = mimeType || getMimeType(filename);
  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      await requestStoragePermissionsIfNeeded();

      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const base64Data = await blobToBase64(blob);

      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: filename,
        url: savedFile.uri
      });
    } catch (err) {
      console.error('Failed to share file natively:', err);
      showNativeToast('Error sharing file: ' + err.message);
    }
  } else if (navigator.share) {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: resolvedMime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch {
      window.open(fileUrl, '_blank');
    }
  } else {
    window.open(fileUrl, '_blank');
  }
}

/**
 * Download a file and open it using native app wrappers or web blob downloader
 */
export async function downloadAndOpenFile(fileUrl, filename = 'document.pdf', mimeType = null) {
  const { resolveBackendFileUrl } = await import('./api');
  const fullUrl = resolveBackendFileUrl(fileUrl);
  const resolvedMime = mimeType || getMimeType(filename);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('pk_token') || 'guest_access_token' : 'guest_access_token';
  const fetchHeaders = { Authorization: `Bearer ${token}` };

  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await requestStoragePermissionsIfNeeded();

      const response = await fetch(fullUrl, { headers: fetchHeaders });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status} when fetching document.`);
      }

      const blob = await response.blob();
      
      // Binary PDF validation check
      if (filename.toLowerCase().endsWith('.pdf') || resolvedMime === 'application/pdf') {
        const headerSlice = await blob.slice(0, 10).text();
        if (!headerSlice.startsWith('%PDF-')) {
          console.error('[Download Error] Unexpected non-PDF payload received:', headerSlice);
          throw new Error('Downloaded content is not a valid PDF document (%PDF- header missing).');
        }
      }

      const base64Data = await blobToBase64(blob);

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      try {
        const { FileOpener } = await import('@capacitor-community/file-opener');
        await FileOpener.open({
          filePath: result.uri,
          contentType: resolvedMime,
          openWithDefault: true
        });
      } catch (openerErr) {
        console.warn('FileOpener unavailable or failed, falling back to Share:', openerErr);
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: filename,
          url: result.uri
        });
      }
    } catch (err) {
      console.error('Failed to download and open file natively:', err);
      showNativeToast('Error opening file: ' + err.message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Download Error: ' + err.message);
      }
      throw err;
    }
  } else {
    // Web / Browser download with Blob URL fallback
    try {
      const response = await fetch(fullUrl, { headers: fetchHeaders });
      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status} when fetching document.`);
      }

      const blob = await response.blob();

      // Binary validation check
      const lowerName = filename.toLowerCase();
      if (lowerName.endsWith('.pdf') || resolvedMime === 'application/pdf') {
        const headerSlice = await blob.slice(0, 10).text();
        if (!headerSlice.startsWith('%PDF-')) {
          console.error('[Download Error] Unexpected non-PDF payload received:', headerSlice);
          throw new Error('Downloaded content is not a valid PDF document (%PDF- header missing).');
        }
      } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.pptx') || resolvedMime.includes('officedocument')) {
        const headerSlice = await blob.slice(0, 4).text();
        if (!headerSlice.startsWith('PK')) {
          console.error('[Download Error] Unexpected non-Office payload received:', headerSlice);
          throw new Error('Downloaded content is not a valid Office document (corrupted payload or error response).');
        }
      }

      const fileBlob = new Blob([blob], { type: resolvedMime || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(fileBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('[Web Download Error]:', err);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Download Failed: ' + err.message);
      }
      throw err;
    }
  }
}

/**
 * Native Dialog Alert/Confirm fallback
 */
export async function showAlert(title, message) {
  if (isNative) {
    const { Dialog } = await import('@capacitor/dialog');
    await Dialog.alert({ title, message });
  } else {
    alert(message);
  }
}

export async function showConfirm(title, message, okButtonTitle = 'OK', cancelButtonTitle = 'Cancel') {
  if (isNative) {
    const { Dialog } = await import('@capacitor/dialog');
    const result = await Dialog.confirm({ title, message, okButtonTitle, cancelButtonTitle });
    return result.value;
  } else {
    return confirm(message);
  }
}

/**
 * Get device information
 */
export async function getDeviceInfo() {
  if (isNative) {
    const { Device } = await import('@capacitor/device');
    return await Device.getInfo();
  }
  return {
    platform: 'web',
    model: navigator.userAgent,
    operatingSystem: 'unknown'
  };
}

/**
 * Get network status
 */
export async function getNetworkStatus() {
  if (isNative) {
    const { Network } = await import('@capacitor/network');
    return await Network.getStatus();
  }
  return {
    connected: navigator.onLine,
    connectionType: 'wifi'
  };
}

/**
 * Configure Status Bar style and color for Native and Mobile Web / PWA
 */
export async function configureStatusBar(isDark) {
  // Update browser theme-color meta tag for mobile web browsers & PWA titlebar
  try {
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', isDark ? '#0B1120' : '#FFFFFF');
  } catch (err) {
    console.debug('Failed to set theme color meta tag:', err);
  }

  if (isNative) {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      // Ensure proper separation on native devices
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      }).catch(() => {});
      await StatusBar.setBackgroundColor({
        color: isDark ? '#0B1120' : '#FFFFFF'
      }).catch(() => {});
    } catch (err) {
      console.warn('Status Bar configuration failed:', err);
    }
  }
}

// Utility: convert Blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
