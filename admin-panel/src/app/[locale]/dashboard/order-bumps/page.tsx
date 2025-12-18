'use client'

import DashboardLayout from '@/components/DashboardLayout'
import OrderBumpsPageContent from '@/components/OrderBumpsPageContent'
import { withAdminAuth } from '@/components/withAdminAuth'
import { useAuth } from '@/contexts/AuthContext'

function OrderBumpsPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={{ email: user!.email!, id: user!.id }}>
      <OrderBumpsPageContent />
    </DashboardLayout>
  )
}

export default withAdminAuth(OrderBumpsPage)
