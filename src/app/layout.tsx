import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognitive Dissonance',
  description: 'Hold the fragile glass AI mind together as its own thoughts try to escape.',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Cover the notch/home-indicator safe areas; we handle safe-area-inset CSS
  // vars manually in components that need them (game canvas is full-bleed).
  viewportFit: 'cover',
  // Lock to black so the initial flash matches scene clear color
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // bg-black is intentional — game renders on a black background, not a missing design token
  return (
    <html lang="en" className="bg-black">
      <body>{children}</body>
    </html>
  );
}
