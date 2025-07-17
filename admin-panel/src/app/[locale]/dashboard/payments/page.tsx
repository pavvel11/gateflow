// app/[locale]/dashboard/payments/page.tsx
// Admin payments management page

'use client'

import DashboardLayout from '@/components/DashboardLayout'
import PaymentsDashboard from '@/components/admin/PaymentsDashboard'
import { ToastProvider } from '@/contexts/ToastContext'
import { withAdminAuth } from '@/components/withAdminAuth'
import { useAuth } from '@/contexts/AuthContext'

function PaymentsPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={{ email: user!.email!, id: user!.id }}>
      <div className="space-y-6">
        <ToastProvider>
          <PaymentsDashboard />
        </ToastProvider>
      </div>
    </DashboardLayout>
  )
}

export default withAdminAuth(PaymentsPage)
