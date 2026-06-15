import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('easypg_token')?.value;
  const decoded = token ? decodeJwt(token) : null;
  const role = decoded?.role || request.cookies.get('easypg_role')?.value;

  const isAuthRoute = pathname.startsWith('/login');
  
  const isSuperAdminRoute = pathname.startsWith('/superadmin');
  
  const isDashboardRoute = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/branches') ||
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/admissions') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/setup');

  // If trying to access protected routes without a token
  if (!token && (isSuperAdminRoute || isDashboardRoute)) {
    const loginUrl = new URL('/login', request.url);
    // Optional: save redirect URL
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access login
  if (token && isAuthRoute) {
    if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // SuperAdmin route protection
  if (isSuperAdminRoute && role !== 'SUPERADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Dashboard route protection
  if (isDashboardRoute && (role === 'SUPERADMIN' || role === 'SUPER_ADMIN')) {
    // Redirect SuperAdmin to their panel if they attempt to go to normal dashboard
    return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/superadmin/:path*',
    '/dashboard/:path*',
    '/branches/:path*',
    '/rooms/:path*',
    '/tenants/:path*',
    '/admissions/:path*',
    '/invoices/:path*',
    '/payments/:path*',
    '/users/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/setup/:path*',
  ],
};
