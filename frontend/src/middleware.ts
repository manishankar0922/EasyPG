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

  const token = request.cookies.get('u9pgs_token')?.value;
  const decoded = token ? decodeJwt(token) : null;
  const role = decoded?.role || request.cookies.get('u9pgs_role')?.value;

  const isAuthRoute = pathname.startsWith('/login');
  
  const isSuperAdminRoute = pathname.startsWith('/superadmin');
  
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reports') ||
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

  // Subdomain Logic (dev., admin., tenant.)
  const hostname = request.headers.get('host') || '';
  let subdomain = '';
  
  // Check for simulation override query parameter (highly useful for testing without a custom domain)
  const urlSubdomain = request.nextUrl.searchParams.get('subdomain');
  let cookieSubdomain = request.cookies.get('u9pgs_simulated_subdomain')?.value;

  if (urlSubdomain) {
    if (urlSubdomain === 'clear') {
      cookieSubdomain = undefined;
    } else if (['dev', 'admin', 'tenant', 'tenet'].includes(urlSubdomain)) {
      cookieSubdomain = urlSubdomain;
    }
  }

  if (cookieSubdomain) {
    subdomain = cookieSubdomain;
  } else if (hostname.endsWith('.vercel.app')) {
    const prefix = hostname.split('.')[0]; // e.g. "dev-u9pgs"
    if (prefix.startsWith('dev-')) {
      subdomain = 'dev';
    } else if (prefix.startsWith('admin-')) {
      subdomain = 'admin';
    } else if (prefix.startsWith('tenant-') || prefix.startsWith('tenet-')) {
      subdomain = 'tenant';
    }
  } else if (hostname.split('.').length >= 3 || hostname.includes('localhost:')) {
    subdomain = hostname.split('.')[0];
  }

  // --- Subdomain Isolation Shields ---
  
  // Create response object early so we can write cookies if needed
  let response = NextResponse.next();

  // If a new subdomain query was provided, redirect to clean the URL bar but preserve the cookie
  if (urlSubdomain) {
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    // Keep any other search parameters except subdomain
    request.nextUrl.searchParams.forEach((val, key) => {
      if (key !== 'subdomain') cleanUrl.searchParams.set(key, val);
    });
    response = NextResponse.redirect(cleanUrl);
    if (urlSubdomain === 'clear') {
      response.cookies.delete('u9pgs_simulated_subdomain');
    } else if (['dev', 'admin', 'tenant', 'tenet'].includes(urlSubdomain)) {
      response.cookies.set('u9pgs_simulated_subdomain', urlSubdomain, { path: '/' });
    }
    return response;
  }
  
  // 1. Tenant Subdomain Shield
  if (subdomain === 'tenant' || subdomain === 'tenet') {
    // Hard Lock: ONLY Tenants allowed on this subdomain
    if (token && role && role !== 'TENANT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // Tenants cannot access Admin/Staff routes
    if (
      isSuperAdminRoute || 
      pathname.startsWith('/branches') || 
      pathname.startsWith('/rooms') || 
      pathname.startsWith('/tenants') || 
      pathname.startsWith('/admissions') || 
      pathname.startsWith('/users')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // 2. Dev Subdomain Shield
  if (subdomain === 'dev') {
    // Hard Lock: ONLY SuperAdmins allowed on this subdomain
    if (token && role && role !== 'SUPERADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // Devs should strictly be in SuperAdmin routes
    if (isDashboardRoute) {
      return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
    }
  }

  // 3. Admin Subdomain Shield (for PG Owners/Clients)
  if (subdomain === 'admin') {
    // Hard Lock: ONLY Owners and Wardens allowed on this subdomain
    if (token && role && role === 'TENANT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // Clients cannot access SuperAdmin routes
    if (isSuperAdminRoute) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // --- Standard Auth Routing ---

  // If trying to access protected routes without a token
  if (!token && (isSuperAdminRoute || isDashboardRoute)) {
    const loginUrl = new URL('/login', request.url);
    // SECURITY: Only pass internal relative paths as redirect target.
    // Block open redirect: an attacker could craft /login?redirect=https://evil.com
    // Only allow paths that start with / and have no protocol (no http:// etc)
    const safeRedirect = pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes(':') 
      ? pathname 
      : '/dashboard';
    loginUrl.searchParams.set('redirect', safeRedirect);
    return NextResponse.redirect(loginUrl);
  }

  // Rewrite /login based on subdomain so each has a unique UI
  if (isAuthRoute && pathname === '/login') {
    if (subdomain === 'tenant' || subdomain === 'tenet') return NextResponse.rewrite(new URL('/login/tenant', request.url));
    if (subdomain === 'admin') return NextResponse.rewrite(new URL('/login/admin', request.url));
    if (subdomain === 'dev') return NextResponse.rewrite(new URL('/login/dev', request.url));
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
    '/reports/:path*',
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
