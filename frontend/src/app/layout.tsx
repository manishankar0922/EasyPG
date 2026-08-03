import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from 'sonner';

// Self-hosted variable font: one file covering all weights, preloaded and
// non-render-blocking. Replaces the old CSS @import to Google Fonts, which was
// a request waterfall AND blocked by our CSP (font-src 'self').
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://u9pgs.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'U9PGs — PG & Hostel Management Software on Autopilot',
    template: '%s · U9PGs',
  },
  description:
    'Automate rent collection, track occupancy in real time, and manage every PG branch from one dashboard. Built for Indian hostel and PG owners. 14-day free trial, no credit card required.',
  keywords: [
    'PG management software',
    'hostel management system',
    'rent collection automation',
    'PG owner dashboard',
    'hostel software India',
    'tenant management',
    'U9PGs',
  ],
  authors: [{ name: 'U9PGs' }],
  creator: 'U9PGs',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'U9PGs',
    title: 'U9PGs — Run your PG business on autopilot',
    description:
      'Automate rent collection, track occupancy in real time, and manage every PG branch from one dashboard. Built for Indian hostel and PG owners.',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'U9PGs — PG management on autopilot' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'U9PGs — Run your PG business on autopilot',
    description:
      'Automate rent collection, track occupancy in real time, and manage every PG branch from one dashboard.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">
        <Providers>
          {children}
        </Providers>
        <Toaster
          richColors
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter, sans-serif', fontWeight: '600', borderRadius: '16px' }
          }}
        />
      </body>
    </html>
  );
}
