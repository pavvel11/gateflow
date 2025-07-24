// app/api/admin/payments/sessions/[sessionId]/cancel/route.ts
// NOTE: This endpoint is not used in embedded checkout flow
// Keeping for API compatibility but returns not implemented

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  
  return NextResponse.json({ 
    error: 'Session cancellation not supported in embedded checkout',
    sessionId 
  }, { status: 501 });
}
