/**
 * Auth Logout API Route
 * يتم استدعاؤه من api-client لتسجيل الخروج
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/server';
import { AUTH_ENDPOINTS } from '@/lib/auth/constants';

export async function POST(request: NextRequest) {
  try {
    // 1. محاولة إبطال الـ token على Backend
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      // Try to invalidate on the backend (non-blocking)
      fetch(AUTH_ENDPOINTS.logout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // Ignore errors - we'll clear cookies anyway
      });
    }

    // 2. حذف جميع الـ auth cookies
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Logout error:', error);
    
    // حتى لو فشل، نحذف الـ cookies
    await clearAuthCookies();
    
    return NextResponse.json({ success: true });
  }
}
