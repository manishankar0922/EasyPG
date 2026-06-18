import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-session
 *
 * Clears HttpOnly session cookies on logout.
 * Since HttpOnly cookies cannot be deleted via document.cookie in JS,
 * they must be expired server-side through this route.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const expired = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };

  response.cookies.set('u9pgs_token', '', expired);
  response.cookies.set('u9pgs_role', '', expired);

  return response;
}
