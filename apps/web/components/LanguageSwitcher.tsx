'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';
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
            className="bg-transparent border rounded p-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
            <option value="id">🇮🇩 ID</option>
            <option value="en">🇺🇸 EN</option>
        </select>
    );
}
