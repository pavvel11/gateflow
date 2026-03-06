'use client';

/**
 * Security audit panel for Settings > System tab.
 * Runs diagnostic checks against Supabase configuration and shows
 * actionable warnings for production hardening.
 *
 * @see lib/actions/security-audit.ts
 */

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getSecurityAudit, runSecurityAudit } from '@/lib/actions/security-audit';
import type { SecurityCheckResult, SecurityAuditResult } from '@/lib/actions/security-audit';

function CheckIcon({ status }: { status: SecurityCheckResult['status'] }) {
  if (status === 'pass') return <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (status === 'fail') return <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />;
  return <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
}

function CheckRow({ check }: { check: SecurityCheckResult }) {
  const [expanded, setExpanded] = useState(check.status !== 'pass');

  return (
    <div className={`border p-4 ${
      check.status === 'pass' ? 'border-sf-border-light' :
      check.status === 'fail' ? 'border-red-500/30 bg-red-500/5' :
      'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full text-left"
      >
        <CheckIcon status={check.status} />
        <span className="text-sm font-medium text-sf-heading flex-1">{check.name}</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${
          check.status === 'pass' ? 'bg-green-500/10 text-green-600' :
          check.status === 'fail' ? 'bg-red-500/10 text-red-600' :
          'bg-yellow-500/10 text-yellow-600'
        }`}>
          {check.status.toUpperCase()}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 ml-8 space-y-2">
          <p className="text-sm text-sf-body">{check.message}</p>
          {check.fix && (
            <div className="text-sm bg-sf-surface p-3 border border-sf-border-light">
              <span className="font-medium text-sf-heading">How to fix: </span>
              <span className="text-sf-body">{check.fix}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityAuditSettings() {
  const t = useTranslations('securityAudit');
  const [result, setResult] = useState<SecurityAuditResult | null>(null);
  const [running, setRunning] = useState(false);

  // Auto-load cached results on mount
  useEffect(() => {
    let mounted = true;
    setRunning(true);
    getSecurityAudit()
      .then(data => { if (mounted) setResult(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setRunning(false); });
    return () => { mounted = false; };
  }, []);

  // Force fresh audit (bypass cache)
  async function handleRun() {
    setRunning(true);
    try {
      const data = await runSecurityAudit();
      setResult(data);
    } catch {
      setResult({ success: false, checks: [], timestamp: new Date().toISOString(), error: 'Audit failed' });
    } finally {
      setRunning(false);
    }
  }

  const passCount = result?.checks.filter(c => c.status === 'pass').length ?? 0;
  const warnCount = result?.checks.filter(c => c.status === 'warn').length ?? 0;
  const failCount = result?.checks.filter(c => c.status === 'fail').length ?? 0;

  return (
    <div className="bg-sf-base border-2 border-sf-border-medium p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-sf-muted" />
          <h2 className="text-xl font-semibold text-sf-heading">
            {t('title')}
          </h2>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sf-accent border border-sf-accent/30 hover:bg-sf-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('running')}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {t('runAgain')}
            </>
          )}
        </button>
      </div>

      <p className="text-sm text-sf-muted mb-4">{t('description')}</p>

      {result?.error && (
        <div className="p-3 bg-red-500/5 border border-red-500/30 text-sm text-red-600 mb-4">
          {result.error}
        </div>
      )}

      {result?.success && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            {passCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <ShieldCheck className="w-4 h-4" /> {passCount} {t('passed')}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="w-4 h-4" /> {warnCount} {t('warnings')}
              </span>
            )}
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <ShieldAlert className="w-4 h-4" /> {failCount} {t('issues')}
              </span>
            )}
          </div>

          {/* Check results - issues first, then warnings, then pass */}
          <div className="space-y-2">
            {result.checks
              .sort((a, b) => {
                const order = { fail: 0, warn: 1, pass: 2 };
                return order[a.status] - order[b.status];
              })
              .map(check => (
                <CheckRow key={check.id} check={check} />
              ))
            }
          </div>

          <p className="text-xs text-sf-muted mt-4">
            {t('lastRun')}: {new Date(result.timestamp).toLocaleString()}
          </p>
        </>
      )}

      {!result && !running && (
        <div className="text-sm text-sf-muted italic">
          {t('notRunYet')}
        </div>
      )}
    </div>
  );
}
