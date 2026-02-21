# Logout Redirect Fix - /id/login Issue

## Problem Summary

After logout, the application was redirecting to `http://localhost:3000/id/login` instead of `http://localhost:3000/login`.

## Root Cause Analysis

### 1. next-intl Integration
The application uses `next-intl` for internationalization with:
- Locales: `['id', 'en']`
- Default locale: `'id'` (Indonesian)
- Configuration in `next.config.js` line 1-4:
  ```javascript
  const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
  ```

### 2. Locale-Aware Router
Several components were using the locale-aware router from `@/src/i18n/navigation`:
```typescript
import { useRouter } from '@/src/i18n/navigation';
```

This router is created by `next-intl` and automatically prepends locale prefixes to all routes:
```typescript
router.push('/login')  →  redirects to '/id/login'
```

### 3. Missing Middleware
- No active `middleware.ts` file in project root (only `middleware.ts.backup` exists)
- However, `next-intl` plugin generates middleware automatically during build
- The auto-generated middleware may be adding locale prefixes to routes

### 4. Affected Components
The following components were using the i18n router for logout:
- `components/layout/topbar.tsx` (line 156)
- `components/layout/agrinova-sidebar.tsx` (line 126)

## Solution Implemented

### Fix 1: Topbar Component
**File:** `E:\agrinova\apps\web\components\layout\topbar.tsx`
**Line:** 155-157

Changed from:
```typescript
finally {
  setIsLoggingOut(false);
  router.push('/login');
}
```

To:
```typescript
finally {
  setIsLoggingOut(false);
  // Use hard redirect to avoid locale prefix from next-intl router
  // This ensures we go to /login instead of /id/login
  window.location.href = '/login';
}
```

### Fix 2: Sidebar Component
**File:** `E:\agrinova\apps\web\components\layout\agrinova-sidebar.tsx`
**Line:** 125-127

Changed from:
```typescript
finally {
  setIsLoggingOut(false);
  router.push('/login');
}
```

To:
```typescript
finally {
  setIsLoggingOut(false);
  // Use hard redirect to avoid locale prefix
  window.location.href = '/login';
}
```

## Why This Fix Works

1. **Bypasses Next.js Router**: `window.location.href` performs a full browser navigation, bypassing Next.js client-side routing
2. **Avoids Locale Prefix**: Since it's not using the `next-intl` router, no locale prefix is added
3. **Ensures Clean State**: Hard redirect ensures all client-side state is cleared during logout
4. **Already Used Elsewhere**: The codebase already uses this pattern in `logout-redirect-service.ts` (line 244, 249)

## Other Components Checked

The following components use `router.push('/login')` but with the standard `next/navigation` router (not i18n router), so they are NOT affected:
- `app/users/page.tsx`
- `app/settings/page.tsx`
- `app/reports/page.tsx`
- `app/profile/page.tsx`
- `app/gate-check/page.tsx`
- `app/dashboard/page.tsx`
- `components/auth/protected-route.tsx`

These files import from `'next/navigation'` instead of `'@/src/i18n/navigation'`, so they don't add locale prefixes.

## Alternative Solutions Considered

### Option 1: Remove next-intl (Not Recommended)
- Would break existing i18n functionality
- Language switching components depend on it
- Translation infrastructure already built

### Option 2: Restore middleware.ts (Complex)
- Would need to handle locale routing properly
- Requires restructuring app directory with `[locale]` folders
- More work than necessary for this fix

### Option 3: Use Locale-Aware Paths (Not Ideal)
- Accept `/id/login` as the correct path
- Would require updating all login-related code
- Inconsistent with current architecture (no `[locale]` folder structure)

## Testing Recommendations

1. Test logout from topbar dropdown
2. Test logout from sidebar
3. Verify redirect goes to `/login` not `/id/login`
4. Test language switching still works
5. Test login after logout works correctly
6. Test with both Indonesian and English language settings

## Related Files

- `next.config.js` - next-intl plugin configuration
- `src/i18n/request.ts` - Locale detection and message loading
- `src/i18n/settings.ts` - Locale definitions
- `src/i18n/navigation.ts` - Creates locale-aware navigation utilities
- `lib/auth/logout-redirect-service.ts` - Already uses hard redirects

## Notes

- The application uses next-intl for translations but does NOT use locale-based routing (no `[locale]` directory structure in app folder)
- This is a valid configuration where i18n is cookie-based rather than URL-based
- The fix aligns with this architecture by not using locale prefixes in URLs
