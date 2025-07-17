// app/api/admin/payments/sessions/[sessionId]/cancel/route.ts
// API endpoint for cancelling payment sessions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check admin privileges
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find the payment session
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or already processed' }, { status: 404 });
    }

    // Update session status to cancelled
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Error cancelling session:', updateError);
      return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Session cancelled successfully' 
    });

  } catch (error) {
    console.error('Cancel session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
