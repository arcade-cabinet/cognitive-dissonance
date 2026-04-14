import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Cognitive Dissonance.
 *
 * The web build (`pnpm build` with GITHUB_PAGES=true) produces a static
 * export in `out/`. Capacitor copies that into the native iOS/Android
 * projects via `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.cognitivedissonance',
  appName: 'Cognitive Dissonance',
  webDir: 'out',

  // Backgrounding behavior — audio/WebGL keep running when app is backgrounded
  // (so a quick home-button tap doesn't kill an active run)
  backgroundColor: '#000000',

  // WebView tuning for Babylon.js / WebGL performance
  ios: {
    contentInset: 'always', // respect safe areas (notch, home indicator)
    scrollEnabled: false, // game is full-viewport, no page scroll
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    backgroundColor: '#000000',
    allowMixedContent: false,
    captureInput: true, // gives WebView priority over native for touch events
    webContentsDebuggingEnabled: false, // set true for dev builds if needed
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK', // light text on dark bg
      backgroundColor: '#000000',
      overlaysWebView: false,
    },
    ScreenOrientation: {
      // Let the CSS + device detection handle orientation logic
    },
  },
};

export default config;
