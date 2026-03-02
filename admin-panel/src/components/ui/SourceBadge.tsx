'use client'

import { useTranslations } from 'next-intl'

import type { ConfigSource } from '@/lib/stripe/checkout-config'

interface SourceBadgeProps {
  source: ConfigSource
  envAlsoSet?: boolean
}

const STYLES: Record<ConfigSource, string> = {
  db: 'bg-sf-accent-soft text-sf-accent',
  env: 'bg-sf-accent-soft text-sf-accent',
  default: 'bg-sf-raised text-sf-muted',
}

export default function SourceBadge({ source, envAlsoSet }: SourceBadgeProps) {
  const t = useTranslations('settings.configSource')

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 ${STYLES[source]}`}>
        {t(source)}
      </span>
      {source === 'db' && envAlsoSet && (
        <span className="text-[9px] text-sf-muted">
          ({t('overridesEnv')})
        </span>
      )}
    </span>
  )
}
