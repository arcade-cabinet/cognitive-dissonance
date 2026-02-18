import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognitive Dissonance',
  description: 'Hold the fragile glass AI mind together.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body>{children}</body>
    </html>
  );
}