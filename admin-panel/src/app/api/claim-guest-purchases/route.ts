import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimGuestPurchases } from '@/lib/actions/auth'

/**
 * API route to claim guest purchases for authenticated users
 * This allows client-side components to claim purchases
 */
export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Claim guest purchases for this user
    const result = await claimGuestPurchases(user.email, user.id)
    
    return NextResponse.json({
      success: result.success,
      claimedCount: result.claimedCount,
      message: result.claimedCount > 0 
        ? `Successfully claimed ${result.claimedCount} guest purchase(s)`
        : 'No guest purchases found to claim'
    })
    
  } catch (error) {
    console.error('Error in claim-guest-purchases API:', error)
    return NextResponse.json(
      { error: 'Failed to claim guest purchases' },
      { status: 500 }
    )
  }
}
