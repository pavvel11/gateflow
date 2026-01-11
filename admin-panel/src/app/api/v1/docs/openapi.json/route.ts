/**
 * OpenAPI Spec Endpoint
 *
 * GET /api/v1/docs/openapi.json - Returns the OpenAPI 3.1 specification
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOpenApiDocument } from '@/lib/api/schemas';

// Cache the spec for performance
let cachedSpec: ReturnType<typeof generateOpenApiDocument> | null = null;

export async function GET(request: NextRequest) {
  // Generate spec (cached for performance)
  if (!cachedSpec) {
    cachedSpec = generateOpenApiDocument();
  }

  return NextResponse.json(cachedSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
    },
  });
}
