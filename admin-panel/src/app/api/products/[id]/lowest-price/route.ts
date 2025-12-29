/**
 * API endpoint to get the lowest price for a product in the last 30 days
 * Implements EU Omnibus Directive (2019/2161) requirement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLowestPriceInLast30Days } from '@/lib/services/omnibus';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await getLowestPriceInLast30Days(productId);

    return NextResponse.json({
      lowestPrice: result?.lowestPrice ?? null,
      currency: result?.currency ?? null,
      effectiveFrom: result?.effectiveFrom ?? null,
    });
  } catch (error) {
    console.error('Error fetching lowest price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
