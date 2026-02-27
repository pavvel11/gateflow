import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout, FetchTimeoutError, FETCH_TIMEOUT_MS } from '@/lib/fetch-with-timeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns response on successful fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await fetchWithTimeout('/api/test');

    expect(response).toBe(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('passes through fetch options', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await fetchWithTimeout('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('/api/test');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options?.body).toBe('{}');
  });

  it('uses default timeout constant', () => {
    expect(FETCH_TIMEOUT_MS).toBe(10_000);
  });

  it('throws FetchTimeoutError when fetch exceeds timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const fetchPromise = fetchWithTimeout('/api/slow', { timeoutMs: 5000 });

    // Advance past the timeout
    vi.advanceTimersByTime(5000);

    await expect(fetchPromise).rejects.toThrow(FetchTimeoutError);
    await expect(fetchPromise).rejects.toThrow('timed out after 5000ms');
  });

  it('respects custom timeoutMs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const fetchPromise = fetchWithTimeout('/api/slow', { timeoutMs: 2000 });

    // Not yet timed out
    vi.advanceTimersByTime(1999);

    // Now timeout
    vi.advanceTimersByTime(1);

    await expect(fetchPromise).rejects.toThrow(FetchTimeoutError);
  });

  it('throws AbortError (not FetchTimeoutError) on external signal abort', async () => {
    const externalController = new AbortController();

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const fetchPromise = fetchWithTimeout('/api/test', {
      signal: externalController.signal,
      timeoutMs: 30000,
    });

    // External abort (e.g. component unmount)
    externalController.abort();

    await expect(fetchPromise).rejects.toThrow(DOMException);
    await expect(fetchPromise).rejects.not.toThrow(FetchTimeoutError);
  });

  it('handles already-aborted external signal', async () => {
    const externalController = new AbortController();
    externalController.abort();

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          if (options?.signal?.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const fetchPromise = fetchWithTimeout('/api/test', {
      signal: externalController.signal,
    });

    await expect(fetchPromise).rejects.toThrow(DOMException);
    await expect(fetchPromise).rejects.not.toThrow(FetchTimeoutError);
  });

  it('clears timeout on successful response', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await fetchWithTimeout('/api/test');

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('re-throws non-abort errors as-is', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError);

    await expect(fetchWithTimeout('/api/test')).rejects.toThrow(TypeError);
    await expect(fetchWithTimeout('/api/test')).rejects.toThrow('Failed to fetch');
  });

  it('FetchTimeoutError contains url and timeoutMs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const fetchPromise = fetchWithTimeout('/api/products/test/access', { timeoutMs: 3000 });
    vi.advanceTimersByTime(3000);

    try {
      await fetchPromise;
    } catch (error) {
      expect(error).toBeInstanceOf(FetchTimeoutError);
      expect((error as FetchTimeoutError).url).toBe('/api/products/test/access');
      expect((error as FetchTimeoutError).timeoutMs).toBe(3000);
      expect((error as FetchTimeoutError).name).toBe('FetchTimeoutError');
    }
  });
});
