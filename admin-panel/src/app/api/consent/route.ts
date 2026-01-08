import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute (prevents DB flooding)
    const rateLimitOk = await checkRateLimit('consent_log', 30, 60);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient()
    const body = await request.json()
    
    const { 
      anonymous_id, 
      consents, 
      consent_version,
      user_id 
    } = body

    // Get client info from headers
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const user_agent = request.headers.get('user-agent') || 'unknown'

    // Check if consent logging is enabled first
    const { data: config } = await supabase
      .from('integrations_config')
      .select('consent_logging_enabled')
      .single()

    if (!config?.consent_logging_enabled) {
      return NextResponse.json({ success: true, message: 'Logging disabled' })
    }

    const { error } = await supabase
      .from('consent_logs')
      .insert({
        anonymous_id,
        consents,
        consent_version,
        user_id,
        ip_address,
        user_agent
      })

    if (error) {
      console.error('Failed to log consent:', error)
      return NextResponse.json({ error: 'Failed to log consent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Consent API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
