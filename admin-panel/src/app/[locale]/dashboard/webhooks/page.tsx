'use client';

import DashboardLayout from '@/components/DashboardLayout';
import WebhooksPageContent from '@/components/WebhooksPageContent';
import { withAdminAuth } from '@/components/withAdminAuth';
import { useAuth } from '@/contexts/AuthContext';

function WebhooksPage() {
  const { user } = useAuth();

  // Ensure user exists before rendering layout (though withAdminAuth handles this)
  if (!user) return null;

  return (
    <DashboardLayout user={{ email: user.email!, id: user.id }}>
      <WebhooksPageContent />
    </DashboardLayout>
  );
}

export default withAdminAuth(WebhooksPage);