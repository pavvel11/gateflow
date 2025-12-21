import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpointId, eventType } = body;

    if (!endpointId) {
      return NextResponse.json({ error: 'Endpoint ID required' }, { status: 400 });
    }

    const result = await WebhookService.testEndpoint(endpointId, eventType);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error testing webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
