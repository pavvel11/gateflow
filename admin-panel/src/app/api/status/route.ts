import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    api: {
      health: '/api/health',
      gatekeeper: '/api/gatekeeper',
      test: '/api/test'
    },
    frontend: {
      login: '/login',
      dashboard: '/dashboard',
      products: '/dashboard/products'
    },
    status: 'All systems operational',
    timestamp: new Date().toISOString()
  })
}
