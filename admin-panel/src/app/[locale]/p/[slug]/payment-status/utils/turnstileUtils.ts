// Cloudflare dummy sitekeys for testing - type definition
export type TurnstileTestMode = 
  | 'ALWAYS_PASSES_VISIBLE'
  | 'ALWAYS_BLOCKS_VISIBLE' 
  | 'ALWAYS_PASSES_INVISIBLE'
  | 'ALWAYS_BLOCKS_INVISIBLE'
  | 'INTERACTIVE_CHALLENGE';
