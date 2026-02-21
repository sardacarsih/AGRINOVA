import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './src/i18n/settings';

// Complete redirect mapping for all existing role-prefixed routes to clean URLs
const ROLE_REDIRECTS: Record<string, string> = {
  // Dashboard redirects - role prefixes removed
  '/dashboard/super-admin': '/dashboard',
  '/dashboard/company-admin': '/dashboard',
  '/dashboard/area-manager': '/dashboard',
  '/dashboard/manager': '/dashboard',
  '/dashboard/asisten': '/dashboard',
  '/dashboard/mandor': '/dashboard',
  '/dashboard/satpam': '/dashboard',
  '/dashboard/timbangan': '/dashboard',
  '/dashboard/grading': '/dashboard',

  // Super Admin redirects
  '/dashboard/super-admin/companies': '/companies',
  '/dashboard/super-admin/company-admins': '/users',
  '/dashboard/super-admin/system-logs': '/settings',
  '/dashboard/super-admin/api-keys': '/api-management',
  '/dashboard/api-keys': '/api-management',
  '/dashboard/super-admin/analytics': '/analytics',
  '/dashboard/super-admin/hierarchy': '/hierarchy',
  '/dashboard/super-admin/api-management': '/api-management',
  '/admin/api-management': '/api-management',
  '/dashboard/super-admin/users': '/users',
  '/dashboard/super-admin/users/roles': '/users/roles',
  '/dashboard/super-admin/users/approvals': '/users/approvals',
  '/dashboard/super-admin/companies/hierarchy': '/companies/hierarchy',
  '/dashboard/super-admin/companies/assignments': '/companies/assignments',
  '/dashboard/super-admin/monitoring': '/reports',
  '/dashboard/super-admin/monitoring/performance': '/reports/performance',
  '/dashboard/super-admin/monitoring/database': '/reports/database',
  '/dashboard/super-admin/monitoring/logs': '/reports/logs',
  '/dashboard/super-admin/settings': '/settings',
  '/dashboard/super-admin/notifications': '/notifications',

  // Company Admin redirects
  '/dashboard/company-admin/estates': '/estates',
  '/dashboard/company-admin/divisions': '/divisions',
  '/dashboard/company-admin/blocks': '/blocks',
  '/dashboard/company-admin/users': '/users',
  '/dashboard/company-admin/reports': '/reports',

  // Manager redirects
  '/dashboard/manager/overview': '/dashboard',
  '/dashboard/manager/harvest-reports': '/reports',
  '/dashboard/manager/analytics': '/reports',
  '/dashboard/manager/users': '/budget-divisi',

  // Area Manager redirects
  '/dashboard/area-manager/comparison': '/reports',
  '/dashboard/area-manager/executive-reports': '/reports',
  '/dashboard/area-manager/regional-analytics': '/reports',
  '/dashboard/area-manager/users': '/users',
  '/dashboard/area-manager/system-logs': '/settings',

  // Asisten redirects
  '/dashboard/asisten/approval': '/harvest',
  '/dashboard/asisten/monitoring': '/dashboard',
  '/dashboard/asisten/gate-check': '/gate-check',
  '/dashboard/asisten/reports': '/reports',
  '/dashboard/asisten/notifications': '/notifications',

  // Mandor redirects
  '/dashboard/mandor/panen/multiple-entry': '/harvest',
  '/dashboard/mandor/workers': '/users',
  '/dashboard/mandor/history': '/history',
  '/dashboard/mandor/notifications': '/notifications',

  // Satpam redirects
  '/dashboard/satpam/gate-check': '/gate-check',
  '/dashboard/satpam/qr-scan': '/gate-check',
  '/dashboard/satpam/vehicle-logs': '/vehicles',
  '/dashboard/satpam/daily-report': '/reports',

  // Timbangan redirects
  '/dashboard/timbangan/weighing': '/harvest',
  '/dashboard/timbangan/history': '/history',
  '/dashboard/timbangan/reports': '/reports',

  // Grading redirects
  '/dashboard/grading/input': '/harvest',
  '/dashboard/grading/history': '/history',
  '/dashboard/grading/reports': '/reports',

};

// Helper function to detect locale from NEXT_LOCALE cookie with fallback to accept-language
function getLocaleFromRequest(request: NextRequest): string {
  // Check for NEXT_LOCALE cookie first
  const nextLocaleCookie = request.cookies.get('NEXT_LOCALE');
  if (nextLocaleCookie?.value && locales.includes(nextLocaleCookie.value as any)) {
    return nextLocaleCookie.value;
  }

  // Fallback to legacy agrinova-language cookie for backward compatibility
  const legacyCookie = request.cookies.get('agrinova-language');
  if (legacyCookie?.value && locales.includes(legacyCookie.value as any)) {
    return legacyCookie.value;
  }

  // Fallback to accept-language header
  const acceptLanguage = request.headers.get('accept-language') || '';
  const browserLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
  return browserLang === 'en' ? 'en' : defaultLocale;
}

// Helper function to check if path needs redirect to clean URL
function getRedirectPath(pathname: string): string | null {
  // No locale removal needed - just check direct path
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return ROLE_REDIRECTS[normalizedPath] || null;
}

function stripLocalePrefix(pathname: string): { cleanedPath: string; localeFromPath: string | null } {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (!firstSegment || !locales.includes(firstSegment as any)) {
    return { cleanedPath: pathname, localeFromPath: null };
  }

  const remainingSegments = segments.slice(1);
  const cleanedPath = remainingSegments.length > 0 ? `/${remainingSegments.join('/')}` : '/';

  return { cleanedPath, localeFromPath: firstSegment };
}

// Helper function to check if path is public (doesn't require authentication)
function isPublicPath(pathname: string): boolean {
  const publicPaths = ['/login', '/register', '/forgot-password'];

  return publicPaths.includes(pathname) || publicPaths.some(path => pathname.startsWith(path));
}

// Next.js 16 Proxy - handles cookie-based i18n, role-based access control, and comprehensive redirects
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const { cleanedPath, localeFromPath } = stripLocalePrefix(pathname);
  const detectedLocale = localeFromPath || getLocaleFromRequest(request);

  // Redirect locale-prefixed paths (e.g. /id/profile -> /profile) to clean URL architecture
  if (localeFromPath) {
    const cleanedUrl = request.nextUrl.clone();
    cleanedUrl.pathname = cleanedPath;

    request.nextUrl.searchParams.forEach((value, key) => {
      cleanedUrl.searchParams.set(key, value);
    });

    const localeRedirectResponse = NextResponse.redirect(cleanedUrl);
    localeRedirectResponse.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      httpOnly: false
    });

    return localeRedirectResponse;
  }

  // Create response with NEXT_LOCALE cookie if it doesn't exist or needs updating
  const response = NextResponse.next();

  if (!request.cookies.get('NEXT_LOCALE') || request.cookies.get('NEXT_LOCALE')?.value !== detectedLocale) {
    response.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
      httpOnly: false // Allow client-side access
    });
  }

  // Check for role-prefixed route redirects
  const redirectPath = getRedirectPath(pathname);
  if (redirectPath && redirectPath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;

    // Preserve query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Create redirect response
    const redirectResponse = NextResponse.redirect(url);

    // Set cookie on redirect as well
    if (!request.cookies.get('NEXT_LOCALE') || request.cookies.get('NEXT_LOCALE')?.value !== detectedLocale) {
      redirectResponse.cookies.set('NEXT_LOCALE', detectedLocale, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        httpOnly: false
      });
    }

    return redirectResponse;
  }

  // Continue with the response (including cookie if needed)
  return response;
}

// Configure which paths this middleware should run on
export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.e. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
