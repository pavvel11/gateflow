import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await context.params;
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const { error } = await supabase
      .from('webhook_logs')
      .update({ status: 'archived' })
      .eq('id', logId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    console.error('Error archiving log:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}