import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Examina — Learn CAT concepts with an AI tutor',
  description:
    'An AI tutor that writes on a live whiteboard and walks you through every step out loud.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, instrumentSerif.variable)}>
      <body className="min-h-screen bg-canvas font-ui text-ink antialiased">{children}</body>
    </html>
  );
}
