# Next.js App Router i18n Refactoring Guide

This guide outlines the architecture, best practices, and implementation details for a production-ready i18n setup in Next.js App Router using `next-intl`.

## 1. i18n Architecture in Next.js App Router

### How it Works
In the App Router, i18n relies on **Dynamic Route Segments** (e.g., `/[locale]/page.tsx`) to determine the current language. Middleware intercepts requests to ensure a locale is present, rewriting or redirecting as necessary.

### Server-Side Translation Loading
- **Mechanism**: Translations are loaded on the server during the request time (SSR) or build time (SSG).
- **Benefit**: No client-side bundle bloat. The client only receives the rendered HTML text.
- **`getTranslations`**: An async function used in Server Components to fetch messages.

### Client vs Server Components
- **Server Components**: Use `await getTranslations()`. Direct access to translation files. Zero bundle size cost.
- **Client Components**: Use `useTranslations()`. Requires a `NextIntlClientProvider` to pass messages from the server to the client context.

### Dynamic Route Multilingual
- **Pattern**: `app/[locale]/...`
- **Middleware**: Detects locale from cookies/headers, redirects root `/` to `/[default-locale]`, and persists preference.

## 2. Ideal Folder Structure

```
apps/web/
├── messages/               # Translation files
│   ├── en/
│   │   ├── common.json
│   │   ├── dashboard.json
│   │   └── ...
│   └── id/
│       ├── common.json
│       └── ...
├── src/                    # or app/
│   ├── components/
│   │   ├── LanguageSwitcher.tsx
│   │   └── ...
│   ├── i18n/
│   │   ├── request.ts      # next-intl request config
│   │   ├── navigation.ts   # typed navigation wrappers
│   │   └── settings.ts     # locale constants
│   ├── middleware.ts       # Middleware configuration
│   └── app/
│       ├── [locale]/       # Localized routes
│       │   ├── layout.tsx  # Root layout with NextIntlClientProvider
│       │   └── page.tsx
│       └── api/            # Non-localized API routes
```

## 3. Configuration

### `src/i18n/settings.ts`
Centralized configuration for locales.

```typescript
export const locales = ['id', 'en'] as const;
export const defaultLocale = 'id';
export type Locale = (typeof locales)[number];
```

### `src/i18n/request.ts` (formerly `i18n.ts`)
Configuration for loading messages.

```typescript
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './settings';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}/common.json`)).default,
    // Note: For deep merging multiple files, consider a utility or importing specific namespaces
    // In production, often better to import specific namespaces per page or merge all if small.
  };
});
```

### `src/middleware.ts`
Middleware to handle locale detection and routing.

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/settings';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' // or 'as-needed'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

## 4. Translation Files Example

### `messages/id/common.json`
```json
{
  "Common": {
    "actions": {
      "save": "Simpan",
      "cancel": "Batal",
      "delete": "Hapus"
    },
    "status": {
      "loading": "Memuat...",
      "success": "Berhasil",
      "error": "Terjadi kesalahan"
    }
  },
  "Errors": {
    "network": "Masalah koneksi internet",
    "required": "{field} wajib diisi"
  }
}
```

### `messages/en/common.json`
```json
{
  "Common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    },
    "status": {
      "loading": "Loading...",
      "success": "Success",
      "error": "An error occurred"
    }
  },
  "Errors": {
    "network": "Network connection issue",
    "required": "{field} is required"
  }
}
```

## 5. Implementation Examples

### Server Component (`DashboardPage`)
```tsx
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcomeMessage', { name: 'User' })}</p>
    </div>
  );
}
```

### Client Component (`Navbar`)
```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function Navbar() {
  const t = await useTranslations('Navigation');

  return (
    <nav>
      <a href="/">{t('home')}</a>
      <a href="/about">{t('about')}</a>
    </nav>
  );
}
```

### Dynamic Interpolation & Pluralization
```json
// messages.json
{
  "Cart": {
    "items": "You have {count, plural, =0 {no items} one {# item} other {# items}} in your cart."
  }
}
```

```tsx
const t = useTranslations('Cart');
<p>{t('items', { count: 5 })}</p> // "You have 5 items in your cart."
```

## 6. Language Switcher

### `components/LanguageSwitcher.tsx`
```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation'; // Typed wrapper
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <select 
      defaultValue={locale} 
      onChange={handleChange}
      disabled={isPending}
      className="bg-transparent border rounded p-1"
    >
      <option value="id">Indonesia</option>
      <option value="en">English</option>
    </select>
  );
}
```

## 7. Best Practices

1.  **No Hardcoded Text**: Every visible string must be a key.
2.  **No String Concatenation**: Use interpolation `{variable}` instead of `"Hello " + name`.
3.  **No HTML in JSON**: Use `rich` translation features if formatting is needed, or split keys.
4.  **Namespaces**: Group keys by feature (e.g., `Auth`, `Dashboard`) to avoid collisions and enable lazy loading.
5.  **Type Safety**: Use `global.d.ts` to strictly type `IntlMessages`.
6.  **Fallback**: Ensure `i18n.ts` handles missing locales gracefully.
7.  **Stable Keys**: Use semantic keys (`auth.login.title`) rather than content-based (`auth.welcome_message`).

## 8. Setup Tools & Automation

### Linting
Use `eslint-plugin-next-intl` to catch missing keys.

### Type Generation
Define the global type in `global.d.ts`:
```typescript
type Messages = typeof import('./messages/en/common.json');
declare interface IntlMessages extends Messages {}
```

## 9. Final Checklist

- [ ] All user-facing text is extracted to JSON.
- [ ] `middleware.ts` correctly redirects root and handles cookies.
- [ ] `i18n.ts` loads the correct files for the requested locale.
- [ ] `NextIntlClientProvider` is wrapped around children in `layout.tsx`.
- [ ] Language Switcher persists selection (cookie/URL).
- [ ] 404 Page is localized.
- [ ] Metadata (titles, descriptions) is localized.
- [ ] CI/CD pipeline checks for type errors in translations.
