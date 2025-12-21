import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const countOnly = searchParams.get('count') === 'true';

    if (countOnly) {
      const { count, error } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');
      
      return NextResponse.json({ count: count || 0 });
    }

    // Fetch failed logs joined with endpoint details
    const { data, error } = await supabase
      .from('webhook_logs')
      .select(`
        id,
        created_at,
        http_status,
        response_body,
        payload,
        error_message,
        event_type,
        duration_ms,
        status,
        endpoint:webhook_endpoints (
          id,
          url,
          description
        )
      `)
      .eq('status', 'failed') // Only active failures
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching webhook failures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
