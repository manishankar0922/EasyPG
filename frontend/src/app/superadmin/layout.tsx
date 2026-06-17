'use client';

import { useRoleGuard } from '@/middleware/roleGuard';
import DevLoader from '@/components/superadmin/DevLoader';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized, isChecking } = useRoleGuard(['superadmin', 'SUPER_ADMIN', 'admin'] as any);

  if (isChecking || !isAuthorized) {
    return <DevLoader message="Verifying admin credentials..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {children}
    </div>
  );
}
