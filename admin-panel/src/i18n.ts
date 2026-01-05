import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from '@/lib/locales';

export { locales, defaultLocale, type Locale };

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from the request (set by setRequestLocale in layout)
  let locale = await requestLocale;

  // Validate and fallback to default if needed
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
