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
    const endpointId = searchParams.get('endpointId');
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const countOnly = searchParams.get('count') === 'true';

    // Base query
    // We always join 'endpoint' to get details, it's efficient enough for 20 rows.
    let query = supabase
      .from('webhook_logs')
      .select(
        countOnly 
          ? '* ' 
          : `
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
          `, 
        { count: countOnly ? 'exact' : undefined, head: countOnly }
      );

    // Filters
    // 1. Filter by Endpoint ID (if provided)
    if (endpointId) {
      query = query.eq('endpoint_id', endpointId);
    }

    // 2. Filter by Status
    if (status === 'failed') {
      // Show failed logs (excluding retried and archived)
      query = query.eq('status', 'failed');
    } else if (status === 'success') {
      query = query.eq('status', 'success');
    } else if (status === 'archived') {
      query = query.eq('status', 'archived');
    } else {
      // For 'all', we hide archived logs to keep history clean.
      query = query.neq('status', 'archived');
    }

    // 3. Sorting & Pagination
    if (!countOnly) {
      query = query
        .order('created_at', { ascending: false })
        .limit(limit);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    if (countOnly) {
      return NextResponse.json({ count: count || 0 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}