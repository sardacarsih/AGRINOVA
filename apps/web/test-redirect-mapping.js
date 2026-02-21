#!/usr/bin/env node

/**
 * Test script to verify redirect mappings work correctly
 */

// Test the redirect mapping logic
const ROLE_REDIRECTS = {
  '/dashboard/super-admin': '/dashboard',
  '/dashboard/company-admin': '/dashboard',
  '/dashboard/area-manager': '/dashboard',
  '/dashboard/manager': '/dashboard',
  '/dashboard/asisten': '/dashboard',
  '/dashboard/mandor': '/dashboard',
  '/dashboard/satpam': '/dashboard',
  '/dashboard/timbangan': '/dashboard',
  '/dashboard/grading': '/dashboard',
  '/dashboard/manager/users': '/users',
  '/dashboard/super-admin/users': '/users',
  '/dashboard/company-admin/users': '/users',
  '/dashboard/manager/reports': '/reports',
  '/dashboard/asisten/reports': '/reports',
  '/dashboard/super-admin/settings': '/settings',
  '/dashboard/company-admin/settings': '/settings',
  '/dashboard/mandor/panen/multiple-entry': '/harvest',
  '/dashboard/asisten/harvest': '/harvest',
  '/dashboard/manager/harvest': '/harvest',
  '/dashboard/satpam/gate-check': '/gate-check',
  '/dashboard/manager/estates': '/estates',
  '/dashboard/manager/blocks': '/blocks',
};

const locales = ['id', 'en'];

function getRedirectPath(pathname) {
  // Remove locale from pathname for redirect checking - handle more patterns
  let pathnameWithoutLocale = pathname;

  // Try to match and remove locale prefix
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      pathnameWithoutLocale = pathname.replace(`/${locale}/`, '/');
      break;
    } else if (pathname === `/${locale}`) {
      pathnameWithoutLocale = '/';
      break;
    }
  }

  // Ensure leading slash
  const normalizedPath = pathnameWithoutLocale.startsWith('/') ? pathnameWithoutLocale : `/${pathnameWithoutLocale}`;

  return ROLE_REDIRECTS[normalizedPath] || null;
}

console.log('🧪 Testing Redirect Mapping Logic\n');

const testCases = [
  '/dashboard/super-admin',
  '/dashboard/manager/users',
  '/dashboard/asisten/reports',
  '/dashboard/satpam/gate-check',
  '/id/dashboard/super-admin',
  '/en/dashboard/manager/users',
  '/dashboard',
  '/users',
  '/unknown/path'
];

testCases.forEach(testCase => {
  const redirect = getRedirectPath(testCase);
  console.log(`${testCase} -> ${redirect || 'NO REDIRECT'}`);
});

console.log('\n✅ Redirect mapping test complete');