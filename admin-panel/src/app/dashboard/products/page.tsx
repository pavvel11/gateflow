'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ProductsPageContent from '@/components/ProductsPageContent'
import { withAdminAuth } from '@/components/withAdminAuth'
import { useAuth } from '@/contexts/AuthContext'

function ProductsPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={{ email: user!.email!, id: user!.id }}>
      <ProductsPageContent />
    </DashboardLayout>
  )
}

export default withAdminAuth(ProductsPage)
