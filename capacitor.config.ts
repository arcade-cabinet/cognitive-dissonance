import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.psyduckpanic',
  appName: 'Psyduck Panic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a18',
    },
    ScreenOrientation: {
      orientation: 'any',
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0a0a18',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
