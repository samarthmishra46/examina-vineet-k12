import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { JsonLd } from '@/lib/seo/JsonLd';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
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
  metadataBase: new URL(SITE_URL),
  title: 'Examina — AI Tutor for Board Exam Preparation (CBSE, ICSE, Class 6–12)',
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'CBSE board exam preparation',
    'CBSE Class 10 preparation',
    'CBSE Class 12 preparation',
    'NCERT AI tutor',
    'board exam revision',
    'CBSE sample papers',
    'previous year questions CBSE',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    title: 'Examina — AI Tutor for Board Exam Preparation',
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Examina — AI Tutor for Board Exam Preparation',
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={cn(inter.variable, instrumentSerif.variable)}>
      <body className="min-h-screen bg-canvas font-ui text-ink antialiased">{children}
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'EducationalOrganization',
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: SITE_NAME,
              url: SITE_URL,
              inLanguage: 'en-IN',
            },
          ]}
        />
      </body>
    </html>
  );
}
