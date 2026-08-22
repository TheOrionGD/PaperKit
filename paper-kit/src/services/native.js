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
 * Native file sharing
 */
export async function shareFile(fileUrl, filename, mimeType) {
  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

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
      alert('Error sharing file: ' + err.message);
    }
  } else if (navigator.share) {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: mimeType });
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
 * Download a file and open it using native app wrappers
 */
export async function downloadAndOpenFile(fileUrl, filename, mimeType) {
  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { FileOpener } = await import('@capacitor-community/file-opener');

      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const base64Data = await blobToBase64(blob);

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      await FileOpener.open({
        filePath: result.uri,
        contentType: mimeType
      });
    } catch (err) {
      console.error('Failed to download and open file natively:', err);
      alert('Error opening file: ' + err.message);
    }
  } else {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
 * Configure Status Bar style and color
 */
export async function configureStatusBar(isDark) {
  if (isNative) {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      });
      await StatusBar.setBackgroundColor({
        color: isDark ? '#1F2937' : '#FFFFFF'
      });
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
