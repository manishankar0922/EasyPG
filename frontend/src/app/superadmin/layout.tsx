'use client';

import { useRoleGuard } from '@/middleware/roleGuard';
import { Loader2 } from 'lucide-react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized, isChecking } = useRoleGuard(['superadmin', 'SUPER_ADMIN', 'admin'] as any);

  if (isChecking || !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-medium tracking-wide uppercase">Verifying Super Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {children}
    </div>
  );
}
