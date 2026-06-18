import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-session
 *
 * Sets HttpOnly, Secure, SameSite=Strict session cookies.
 * By using HttpOnly, these cookies are completely invisible to JavaScript —
 * they cannot be read or stolen by XSS attacks.
 *
 * Security notes:
 * - HttpOnly prevents document.cookie access
 * - Secure ensures only sent over HTTPS
 * - SameSite=Strict prevents CSRF from cross-site requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, role } = body;

    // Validate inputs before writing cookies
    if (!token || typeof token !== 'string' || token.length > 4096) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }
    const allowedRoles = ['SUPERADMIN', 'SUPER_ADMIN', 'OWNER', 'WARDEN', 'STAFF', 'TENANT'];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

    const response = NextResponse.json({ success: true });

    // Token cookie — HttpOnly prevents JS from reading it
    response.cookies.set('u9pgs_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    // Role cookie — HttpOnly; middleware reads this for routing decisions
    response.cookies.set('u9pgs_role', role, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
}
