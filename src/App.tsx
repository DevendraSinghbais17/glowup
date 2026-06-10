import React, { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import MasterTracker from './pages/Home';

const App: React.FC = () => {
  useEffect(() => {
    // ── Android native shell configuration ──────────────────────────────────
    const setupNative = async () => {
      try {
        // Dark immersive status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0A0D' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // StatusBar plugin not available on web — safe to ignore
      }

      try {
        // Handle Android hardware back button — minimize instead of closing
        await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            CapApp.minimizeApp();
          } else {
            window.history.back();
          }
        });
      } catch {
        // Not available on web
      }
    };
    setupNative();

    // ── Prevent accidental zoom / pinch on Android ──────────────────────────
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchstart', preventZoom, { passive: false });

    // ── Prevent long-press context menu on Android ──────────────────────────
    const preventContext = (e: Event) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
    };
    document.addEventListener('contextmenu', preventContext);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  return <MasterTracker />;
};

export default App;
