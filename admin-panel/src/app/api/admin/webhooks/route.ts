import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const { data: endpoints, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(endpoints);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && (error.message === 'Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const body = await request.json();
    const { url, events, description } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        url,
        events,
        description,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(endpoint);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && (error.message === 'Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}