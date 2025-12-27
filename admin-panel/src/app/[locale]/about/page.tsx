'use client';

import { useParams } from 'next/navigation';
import { AboutPageEN } from './about-page-en';
import { AboutPagePL } from './about-page-pl';

export default function AboutPage() {
  const params = useParams();
  const locale = params.locale as string;

  // Select the appropriate language component
  if (locale === 'pl') {
    return <AboutPagePL />;
  }

  // Default to English
  return <AboutPageEN />;
}
