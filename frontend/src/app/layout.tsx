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

export const metadata: Metadata = {
  title: "U9PGs – Property Management",
  description: "U9PGs Property Management Solutions – Manage tenants, rooms, and rent with ease.",
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
