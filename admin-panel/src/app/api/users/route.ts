import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get users from auth.users table with product access information
    const query = supabase
      .from('user_product_access')
      .select(`
        user_id,
        created_at,
        product_slug,
        products!inner(name)
      `)

    // Apply search filter if provided
    if (search) {
      // Note: We can't directly search auth.users, so we'll filter on the client side
      // In a real-world scenario, you might want to maintain a users table with searchable fields
    }

    const { data: accessData, error: accessError } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (accessError) {
      console.error('Error fetching user access data:', accessError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    // Get unique user IDs and fetch user details from auth.users
    const userIds = [...new Set(accessData?.map(item => item.user_id) || [])]
    
    // Use admin client to fetch user details
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // We need all users to properly merge data
    })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
    }

    // Merge user data with access data
    const usersMap = new Map(users?.map(u => [u.id, u]) || [])
    const usersWithAccess = userIds.map(userId => {
      const userInfo = usersMap.get(userId)
      if (!userInfo) return null

      const userAccess = accessData?.filter(access => access.user_id === userId) || []
      
      return {
        id: userInfo.id,
        email: userInfo.email || '',
        created_at: userInfo.created_at,
        email_confirmed_at: userInfo.email_confirmed_at,
        last_sign_in_at: userInfo.last_sign_in_at,
        product_access: userAccess.map(access => {
          const product = Array.isArray(access.products) ? access.products[0] : access.products
          return {
            product_slug: access.product_slug,
            product_name: (product as { name: string })?.name || 'Unknown Product',
            granted_at: access.created_at
          }
        })
      }
    }).filter(Boolean)

    // Apply search filter on email if search term provided
    const filteredUsers = search
      ? usersWithAccess.filter(user => 
          user?.email.toLowerCase().includes(search.toLowerCase())
        )
      : usersWithAccess

    return NextResponse.json({
      users: filteredUsers,
      total: filteredUsers.length,
      page: Math.floor(offset / limit) + 1,
      hasMore: filteredUsers.length === limit
    })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
