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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // bg-black is intentional — game renders on a black background, not a missing design token
  return (
    <html lang="en" className="bg-black">
      <body>{children}</body>
    </html>
  );
}
