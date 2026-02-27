import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

interface AccessResponse {
  hasAccess: boolean;
  reason?: 'no_access' | 'expired' | 'inactive' | 'temporal';
  userAccess?: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  };
}

export async function checkProductAccess(
  productSlug: string,
  options?: { signal?: AbortSignal }
): Promise<AccessResponse> {
  const response = await fetchWithTimeout(
    `/api/public/products/${productSlug}/access`,
    { signal: options?.signal }
  );

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response format');
  }
}
