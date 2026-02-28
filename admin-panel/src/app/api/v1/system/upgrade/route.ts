/**
 * POST /api/v1/system/upgrade
 *
 * Triggers the self-upgrade process by running upgrade.sh as a detached process.
 * Returns immediately with an upgrade token for progress tracking.
 *
 * Security:
 * - Admin-only (SYSTEM_READ scope)
 * - Rate limited: 1 request per 10 minutes
 * - Lock file prevents concurrent upgrades
 * - Audit logged
 *
 * @see /admin-panel/scripts/upgrade.sh
 * @see /api/v1/system/upgrade-status
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
  authenticate,
  handleApiError,
  API_SCOPES,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limiting';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { existsSync, openSync, closeSync } from 'fs';

const UPGRADE_SCRIPT_PATHS = [
  '/opt/stacks/sellf/scripts/upgrade.sh',
  '/opt/stacks/sellf/upgrade.sh',
];

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request, [API_SCOPES.SYSTEM_READ]);

    // Rate limit: 1 request per 10 minutes
    const rateLimitOk = await checkRateLimit('system_upgrade', 1, 10, auth.admin.userId);
    if (!rateLimitOk) {
      return jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Upgrade already triggered recently. Please wait before retrying.' } },
        request,
        429
      );
    }

    // Check lock file
    if (existsSync('/tmp/sellf-upgrade.lock')) {
      return jsonResponse(
        { error: { code: 'CONFLICT', message: 'An upgrade is already in progress.' } },
        request,
        409
      );
    }

    // Find upgrade script
    let scriptPath: string | null = null;
    for (const path of UPGRADE_SCRIPT_PATHS) {
      if (existsSync(path)) {
        scriptPath = path;
        break;
      }
    }

    if (!scriptPath) {
      return jsonResponse(
        { error: { code: 'NOT_FOUND', message: 'Upgrade script not found. Self-upgrade is only available on deployed servers.' } },
        request,
        400
      );
    }

    // Generate upgrade token
    const token = randomUUID();

    // Audit log
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_log').insert({
        user_id: auth.admin.userId,
        operation: 'system_upgrade_triggered',
        table_name: 'system',
        performed_by: auth.admin.email || 'unknown',
        new_values: {
          current_version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
          upgrade_token: token,
        },
      });
    } catch (auditErr) {
      console.error('[system/upgrade] Audit log insert failed:', auditErr instanceof Error ? auditErr.message : 'Unknown error');
    }

    // Launch upgrade as detached process — spawn() prevents shell injection
    const logFd = openSync(`/tmp/sellf-upgrade-${token}.log`, 'w', 0o600);
    const child = spawn('bash', [scriptPath, token], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });
    child.unref();
    closeSync(logFd);

    return jsonResponse(
      {
        data: {
          status: 'upgrading',
          token,
          message: 'Upgrade process started. Poll /api/v1/system/upgrade-status for progress.',
        },
      },
      request,
      202
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
