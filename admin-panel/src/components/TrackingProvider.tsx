'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface CustomScript {
  id: string
  name: string
  location: 'head' | 'body'
  content: string
  category: 'essential' | 'analytics' | 'marketing'
}

interface PublicIntegrationsConfig {
  gtm_container_id?: string | null
  gtm_server_container_url?: string | null
  facebook_pixel_id?: string | null
  fb_capi_enabled?: boolean
  umami_website_id?: string | null
  umami_script_url?: string | null
  cookie_consent_enabled?: boolean
  consent_logging_enabled?: boolean
  scripts?: CustomScript[]
}

interface TrackingProviderProps {
  config: PublicIntegrationsConfig | null
}

export default function TrackingProvider({ config }: TrackingProviderProps) {
  if (!config) return null

  const {
    gtm_container_id,
    gtm_server_container_url,
    facebook_pixel_id,
    umami_website_id,
    umami_script_url = 'https://cloud.umami.is/script.js',
    cookie_consent_enabled,
    scripts = []
  } = config

  // GTM base URL - use server container if configured, otherwise default Google URL
  const gtmBaseUrl = gtm_server_container_url
    ? gtm_server_container_url.replace(/\/$/, '') // Remove trailing slash
    : 'https://www.googletagmanager.com'

  // --- GOOGLE CONSENT MODE V2 DEFAULTS ---
  // This script MUST run before GTM to set default consent state
  const consentModeDefaults = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'denied',
      'wait_for_update': 500
    });
  `

  // --- KLARO CONFIG ---
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
    services: [] as any[],
    // Callback for Google Consent Mode V2 integration
    callback: function(consent: Record<string, boolean>) {
      // Update Google Consent Mode when user makes consent choices
      if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        const analyticsGranted = consent['google-tag-manager'] === true;
        const marketingGranted = consent['facebook-pixel'] === true;

        (window as any).gtag('consent', 'update', {
          'analytics_storage': analyticsGranted ? 'granted' : 'denied',
          'ad_storage': marketingGranted ? 'granted' : 'denied',
          'ad_user_data': marketingGranted ? 'granted' : 'denied',
          'ad_personalization': marketingGranted ? 'granted' : 'denied',
        });
      }
    },
  }

  // 1. Add Managed Services
  if (gtm_container_id) {
    klaroConfig.services.push({
      name: 'google-tag-manager',
      title: 'Google Tag Manager',
      purposes: ['analytics'],
      required: false,
    })
  }
  if (facebook_pixel_id) {
    klaroConfig.services.push({
      name: 'facebook-pixel',
      title: 'Meta Pixel',
      purposes: ['marketing'],
      required: false,
    })
  }
  if (umami_website_id) {
    klaroConfig.services.push({
      name: 'umami-analytics',
      title: 'Umami Analytics',
      purposes: ['analytics'],
      required: false,
    })
  }

  // 2. Add Custom Scripts to Klaro (if consent required)
  scripts.forEach(script => {
    if (cookie_consent_enabled && script.category !== 'essential') {
        klaroConfig.services.push({
            name: `script-${script.id}`,
            title: script.name,
            purposes: [script.category],
            required: false
        })
    }
  })

  // --- RENDER HELPERS ---

  const renderScript = (script: CustomScript) => {
    // Basic heuristics to detect if content is wrapped in <script> tags
    // If user pasted "<script>...</script>", we strip tags to use with Next/Script or DangerouslySet
    // If user pasted raw JS "console.log()", we wrap it.
    
    let content = script.content.trim()
    const hasScriptTag = content.startsWith('<script')
    
    // Extract inner content if wrapped
    if (hasScriptTag) {
        content = content.replace(/^<script[^>]*>|<\/script>$/g, '')
    }

    // Determine Logic
    const requiresConsent = cookie_consent_enabled && script.category !== 'essential'
    
    // Props for the script
    const scriptProps: any = {
        id: `script-${script.id}`,
        dangerouslySetInnerHTML: { __html: content }
    }

    if (requiresConsent) {
        scriptProps.type = 'text/plain'
        scriptProps['data-type'] = 'application/javascript'
        scriptProps['data-name'] = `script-${script.id}`
    }

    // Use Next Script for Head/Body injection
    // Note: strategy='afterInteractive' is default. 
    // For 'head', we can try 'beforeInteractive' or rely on Next.js placement.
    // Ideally we'd use portal to head for 'head' scripts, but Script handles it.
    
    return <Script key={script.id} {...scriptProps} />
  }

  return (
    <>
      {/* GOOGLE CONSENT MODE V2 DEFAULTS - Must be FIRST, before GTM */}
      {gtm_container_id && (
        <Script
          id="consent-mode-defaults"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: consentModeDefaults }}
        />
      )}

      {/* KLARO INIT */}
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
        </>
      )}

      {/* MANAGED SCRIPTS */}
      {gtm_container_id && (
        <Script
          id="gtm-script"
          type={cookie_consent_enabled ? "text/plain" : "text/javascript"}
          data-type={cookie_consent_enabled ? "application/javascript" : undefined}
          data-name={cookie_consent_enabled ? "google-tag-manager" : undefined}
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i,u){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            u+'/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtm_container_id}','${gtmBaseUrl}');`
          }}
        />
      )}

      {facebook_pixel_id && (
        <Script
          id="fb-pixel"
          type={cookie_consent_enabled ? "text/plain" : "text/javascript"}
          data-type={cookie_consent_enabled ? "application/javascript" : undefined}
          data-name={cookie_consent_enabled ? "facebook-pixel" : undefined}
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

      {umami_website_id && (
        <Script
          id="umami-script"
          src={umami_script_url || 'https://cloud.umami.is/script.js'}
          strategy="afterInteractive"
          data-website-id={umami_website_id}
          type={cookie_consent_enabled ? "text/plain" : "text/javascript"}
          data-type={cookie_consent_enabled ? "application/javascript" : undefined}
          data-name={cookie_consent_enabled ? "umami-analytics" : undefined}
        />
      )}

      {/* CUSTOM SCRIPTS */}
      {scripts.map(script => renderScript(script))}
    </>
  )
}