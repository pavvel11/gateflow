// Supported locales
export const locales = ['en', 'pl'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';
