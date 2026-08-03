'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { PricingSection } from '@/components/landing/PricingSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { Footer } from '@/components/landing/Footer';

/**
 * Root route — public SaaS landing page.
 *
 * Auth-aware behaviour (preserved from the previous redirect-only page):
 *   - If the visitor already has a valid auth token, send them straight to the
 *     app instead of showing them marketing.
 *   - Otherwise render the landing page. The login link is shared privately
 *     with PG owners, so it is intentionally not surfaced in the navbar.
 */
export default function RootPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only bounce authenticated users. Anonymous visitors see the landing
    // page — we no longer redirect them to /login.
    if (mounted && token) {
      router.replace('/dashboard');
    }
  }, [token, router, mounted]);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <FeaturesGrid />
        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
