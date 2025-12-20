import DashboardLayout from '@/components/DashboardLayout';
import CouponsPageContent from '@/components/CouponsPageContent';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function CouponsPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!adminUser) {
    redirect('/dashboard');
  }

  const t = await getTranslations('admin.coupons');

  return (
    <DashboardLayout user={user}>
      <CouponsPageContent />
    </DashboardLayout>
  );
}
