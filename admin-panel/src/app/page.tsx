import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { locales, defaultLocale } from '@/lib/locales';

export default async function RootPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value;

  // Redirect to appropriate locale
  if (locale && locales.includes(locale as (typeof locales)[number])) {
    redirect(`/${locale}`);
  } else {
    redirect(`/${defaultLocale}`);
  }
}
