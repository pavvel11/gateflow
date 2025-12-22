import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';
import { requireAdminApi } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const body = await request.json();
    const { endpointId, eventType } = body;

    if (!endpointId) {
      return NextResponse.json({ error: 'Endpoint ID required' }, { status: 400 });
    }

    const result = await WebhookService.testEndpoint(endpointId, eventType);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    console.error('Error testing webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}