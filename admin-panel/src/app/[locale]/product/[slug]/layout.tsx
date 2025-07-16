'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductClientRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Extract the slug from the URL
    const path = window.location.pathname;
    const slug = path.split('/').pop();
    
    // Redirect to the canonical URL
    router.replace(`/p/${slug}`);
  }, [router]);

  // Return a loading indicator without wrapping in additional HTML elements
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-white">Redirecting to product page...</p>
      </div>
    </div>
  );
}
