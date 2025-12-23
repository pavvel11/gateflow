/**
 * Integrations validation utilities
 * No external dependencies - pure TypeScript validation matching project style
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface IntegrationsInput {
  gtm_container_id?: string | null;
  google_ads_conversion_id?: string | null;
  google_ads_conversion_label?: string | null;
  facebook_pixel_id?: string | null;
  facebook_capi_token?: string | null;
  facebook_test_event_code?: string | null;
  cookie_consent_enabled?: boolean;
  consent_logging_enabled?: boolean;
  custom_head_code?: string | null;
  custom_body_code?: string | null;
}

export function validateIntegrations(data: IntegrationsInput): ValidationResult {
  const errors: Record<string, string[]> = {};

  const addError = (field: string, message: string) => {
    if (!errors[field]) errors[field] = [];
    errors[field].push(message);
  };

  // GTM ID validation (e.g. GTM-XXXXXX)
  if (data.gtm_container_id) {
    if (!/^GTM-[A-Z0-9]+$/.test(data.gtm_container_id)) {
      addError('gtm_container_id', 'Invalid GTM Container ID format (should be GTM-XXXXXX)');
    }
  }

  // Google Ads Conversion ID validation (e.g. AW-XXXXXX)
  if (data.google_ads_conversion_id) {
    if (!/^AW-[0-9]+$/.test(data.google_ads_conversion_id)) {
      addError('google_ads_conversion_id', 'Invalid Google Ads ID format (should be AW-XXXXXX)');
    }
  }

  // FB Pixel ID validation (numeric)
  if (data.facebook_pixel_id) {
    if (!/^[0-9]+$/.test(data.facebook_pixel_id)) {
      addError('facebook_pixel_id', 'Facebook Pixel ID must be numeric');
    }
  }

  // CAPI Token - just length check if provided
  if (data.facebook_capi_token && data.facebook_capi_token.length < 10) {
    addError('facebook_capi_token', 'Facebook CAPI Token seems too short');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
