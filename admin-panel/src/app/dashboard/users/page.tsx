'use client'

import DashboardLayout from '@/components/DashboardLayout'
import UsersPageContent from '@/components/UsersPageContent'
import { ToastProvider } from '@/contexts/ToastContext'
import { withAdminAuth } from '@/components/withAdminAuth'
import { useAuth } from '@/contexts/AuthContext'

function UsersPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={{ email: user!.email!, id: user!.id }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage user accounts and product access</p>
          </div>
        </div>

        <ToastProvider>
          <UsersPageContent />
        </ToastProvider>
      </div>
    </DashboardLayout>
  )
}

export default withAdminAuth(UsersPage)
