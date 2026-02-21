export const locales = ['id', 'en'] as const;
export const defaultLocale = 'id';
export type Locale = (typeof locales)[number];
