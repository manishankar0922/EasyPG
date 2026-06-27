import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from 'sonner';

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
    <html lang="en">
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
