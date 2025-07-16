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
        <ToastProvider>
          <UsersPageContent />
        </ToastProvider>
      </div>
    </DashboardLayout>
  )
}

export default withAdminAuth(UsersPage)
