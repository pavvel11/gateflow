import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && (error.message === 'Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    await requireAdminApi(supabase);

    const body = await request.json();
    
    // Allow updating active status, events, url, description
    const updates: any = {};
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (body.url) updates.url = body.url;
    if (body.events) updates.events = body.events;
    if (body.description !== undefined) updates.description = body.description;

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error instanceof Error && (error.message === 'Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    console.error('Error updating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}