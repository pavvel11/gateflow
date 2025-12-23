'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

interface PublicIntegrationsConfig {
  gtm_container_id?: string | null
  facebook_pixel_id?: string | null
  cookie_consent_enabled?: boolean
  consent_logging_enabled?: boolean
  custom_head_code?: string | null
  custom_body_code?: string | null
}

interface TrackingProviderProps {
  config: PublicIntegrationsConfig | null
}

export default function TrackingProvider({ config }: TrackingProviderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!config) return null

  const {
    gtm_container_id,
    facebook_pixel_id,
    cookie_consent_enabled,
    consent_logging_enabled,
    custom_head_code,
    custom_body_code
  } = config

  // Inject Raw Custom Code
  // Note: We use dangerouslySetInnerHTML in a Script tag for JS, but for HTML (like <noscript>) 
  // we might need a different approach. For simplicity, we assume <script> mostly.
  // Actually, putting raw HTML into head/body in React is tricky.
  // We'll use a simple effect for body/head injection if possible, or just standard rendered elements.
  
  // HEAD custom code: We can try to render it. But React escapes HTML.
  // Best approach for arbitrary HTML in head/body in Next.js App Router is usually via layout.tsx directly.
  // But here we are a client component.
  // We will leave custom_head_code/custom_body_code for the Server Component (layout.tsx) to handle 
  // via dangerouslySetInnerHTML if possible, or we do it here via effects (less reliable for SEO).
  // Let's assume this component ONLY handles the Managed Integrations (GTM/FB/Klaro).
  // I will update layout.tsx to inject custom codes separately.

  // --- KLARO CONFIG GENERATION ---
  const klaroConfig = {
    version: 1,
    elementID: 'klaro',
    styling: { theme: 'default' },
    noAutoLoad: false,
    htmlTexts: true,
    embedded: false,
    groupByPurpose: true,
    storageMethod: 'cookie',
    cookieName: 'gateflow_consent',
    cookieExpiresAfterDays: 365,
    default: false,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    hideLearnMore: false,
    translations: {
      en: {
        consentModal: {
          title: 'We use cookies',
          description: 'We use cookies to improve your experience and analyze traffic.',
        },
        purposes: {
          analytics: 'Analytics',
          marketing: 'Marketing',
        },
      },
    },
    apps: [] as any[],
  }

  // Helper to add GTM
  if (gtm_container_id) {
    klaroConfig.apps.push({
      name: 'google-tag-manager',
      title: 'Google Tag Manager',
      purposes: ['analytics'],
      cookies: ['_ga', '_gid', '_gat'],
      required: false,
      optOut: false,
      onlyOnce: true,
    })
  }

  // Helper to add Facebook
  if (facebook_pixel_id) {
    klaroConfig.apps.push({
      name: 'facebook-pixel',
      title: 'Meta Pixel',
      purposes: ['marketing'],
      cookies: ['_fbp'],
      required: false,
      optOut: false,
      onlyOnce: true,
    })
  }

  // --- RENDER LOGIC ---

  return (
    <>
      {/* 1. Cookie Consent Enabled: Load Klaro + Scripts with data-name */}
      {cookie_consent_enabled && (
        <>
          <Script
            id="klaro-config"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `var klaroConfig = ${JSON.stringify(klaroConfig)};`
            }}
          />
          <Script
            id="klaro-script"
            src="https://cdn.kiprotect.com/klaro/v0.7/klaro.js"
            strategy="afterInteractive"
          />

          {/* GTM (Managed by Klaro) */}
          {gtm_container_id && (
            <Script
              id="gtm-script"
              type="text/plain"
              data-type="application/javascript"
              data-name="google-tag-manager"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtm_container_id}');`
              }}
            />
          )}

          {/* Facebook Pixel (Managed by Klaro) */}
          {facebook_pixel_id && (
            <Script
              id="fb-pixel"
              type="text/plain"
              data-type="application/javascript"
              data-name="facebook-pixel"
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${facebook_pixel_id}');
                fbq('track', 'PageView');`
              }}
            />
          )}
        </>
      )}

      {/* 2. No Consent Required: Load Scripts Directly */}
      {!cookie_consent_enabled && (
        <>
          {gtm_container_id && (
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtm_container_id}');`
              }}
            />
          )}

          {/* Facebook Pixel */}
          {facebook_pixel_id && (
            <Script
              id="fb-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${facebook_pixel_id}');
                fbq('track', 'PageView');`
              }}
            />
          )}
        </>
      )}
    </>
  )
}
