import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@/lib/locales';

export { locales, defaultLocale, type Locale };

export default getRequestConfig(async () => {
  // Get locale from cookies or detect from headers
  const cookieStore = await cookies();
  let locale = cookieStore.get('locale')?.value as Locale;

  // If no locale in cookies, try to detect from Accept-Language header
  if (!locale || !locales.includes(locale)) {
    // This will be handled by middleware
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
