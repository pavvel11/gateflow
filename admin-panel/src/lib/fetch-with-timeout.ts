/**
 * Fetch wrapper with AbortController-based timeout.
 *
 * Reusable utility for client-side fetches that need a timeout safety net.
 * Supports combining an external AbortSignal (e.g. from useEffect cleanup)
 * with an internal timeout signal.
 *
 * Note: The timeout covers the network request only, not response body
 * parsing (e.g. response.json()). Callers should handle body parsing
 * timeouts separately if needed.
 *
 * @see src/lib/services/webhook-service.ts — server-side AbortController pattern
 */

/** Default timeout for same-server API calls (10 seconds) */
export const FETCH_TIMEOUT_MS = 10_000;

export class FetchTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Fetch with timeout and optional external AbortSignal support.
 *
 * If an external signal is provided (e.g. from a useEffect cleanup),
 * it is combined with the internal timeout signal so that either
 * cancellation source aborts the request.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = FETCH_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options;

  // Track abort source explicitly to avoid race between timeout and external abort
  let abortedByTimeout = false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    abortedByTimeout = true;
    controller.abort();
  }, timeoutMs);

  // If an external signal is provided, forward its abort to our controller
  let onExternalAbort: (() => void) | null = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(externalSignal.reason);
    } else {
      onExternalAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (abortedByTimeout) {
        throw new FetchTimeoutError(url, timeoutMs);
      }
      throw error; // External cancellation — re-throw as-is
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (onExternalAbort && externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
