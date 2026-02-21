import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './settings';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
    // Get locale from NEXT_LOCALE cookie, fallback to legacy cookie, then accept-language, then default
    const cookieStore = await cookies();
    let locale = defaultLocale;

    // Try NEXT_LOCALE cookie first
    const nextLocaleCookie = cookieStore.get('NEXT_LOCALE');
    if (nextLocaleCookie?.value && locales.includes(nextLocaleCookie.value as any)) {
        locale = nextLocaleCookie.value;
    } else {
        // Fallback to legacy agrinova-language cookie
        const legacyCookie = cookieStore.get('agrinova-language');
        if (legacyCookie?.value && locales.includes(legacyCookie.value as any)) {
            locale = legacyCookie.value;
        } else {
            // Use default locale (will be overridden by accept-language detection in layout if needed)
            locale = defaultLocale;
        }
    }

    // Helper function to load messages with fallback to default locale
    async function loadMessagesWithFallback(locale: string, messageKeys: string[]) {
        try {
            const messages = await Promise.all(
                messageKeys.map(key => import(`../../messages/${locale}/${key}.json`))
            );
            return messages.map(msg => msg.default);
        } catch (error) {
            // Fallback to default locale if translation files are missing
            if (locale !== defaultLocale) {
                const messages = await Promise.all(
                    messageKeys.map(key => import(`../../messages/${defaultLocale}/${key}.json`))
                );
                return messages.map(msg => msg.default);
            }
            throw error;
        }
    }

    const messageKeys = ['navigation', 'common', 'forms', 'auth', 'dashboard', 'login', 'errors'];
    const [
        navigation,
        common,
        forms,
        auth,
        dashboard,
        login,
        errors
    ] = await loadMessagesWithFallback(locale, messageKeys);

    return {
        locale,
        messages: {
            navigation,
            common,
            forms,
            auth,
            dashboard,
            login,
            errors
        }
    };
});
