/**
 * Version utilities for the update system.
 *
 * @see /api/admin/system/update-check
 */

/** Current app version from build-time env */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'unknown';

/**
 * Compare two semver strings. Returns true if `latest` is newer than `current`.
 * Handles `v` prefix, partial versions (e.g. "1.0" vs "1.0.1").
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const c = normalize(current);
  const l = normalize(latest);

  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}
