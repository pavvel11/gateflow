#!/bin/bash
# =============================================================================
# GateFlow Demo Instance — Database Reset Script
# =============================================================================
#
# Resets the demo database to seed data. Run via cron for periodic resets:
#   0 * * * * /path/to/demo-reset.sh >> /var/log/gateflow-demo-reset.log 2>&1
#
# Prerequisites:
#   - Supabase CLI installed
#   - Supabase project linked (npx supabase link)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting demo database reset..."

cd "$PROJECT_ROOT"
npx supabase db reset --linked

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Demo database reset completed successfully."
