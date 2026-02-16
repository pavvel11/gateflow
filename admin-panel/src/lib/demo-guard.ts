/**
 * Demo Mode Guard
 *
 * When DEMO_MODE=true, blocks destructive admin actions while keeping
 * checkout and read-only operations working.
 *
 * Usage in server actions:
 *   Throw-pattern:  if (isDemoMode()) throw new Error(DEMO_MODE_ERROR)
 *   Return-pattern: if (isDemoMode()) return { success: false, error: DEMO_MODE_ERROR, errorCode: 'DEMO_MODE' }
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}

export const DEMO_MODE_ERROR = 'This action is disabled in demo mode'
