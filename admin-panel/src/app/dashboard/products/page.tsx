'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ProductsTable from '@/components/ProductsTable'
import { withAdminAuth } from '@/components/withAdminAuth'
import { useAuth } from '@/contexts/AuthContext'

function ProductsPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={{ email: user!.email!, id: user!.id }}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Products
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your products and access control
            </p>
          </div>
        </div>
        
        <ProductsTable />
      </div>
    </DashboardLayout>
  )
}

export default withAdminAuth(ProductsPage)
