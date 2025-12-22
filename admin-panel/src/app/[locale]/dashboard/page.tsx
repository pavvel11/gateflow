import DashboardContent from '@/components/dashboard/DashboardContent';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Fetch failed webhooks count server-side for initial render
  let failedCount = 0;
  try {
    const { count } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');
    failedCount = count || 0;
  } catch (err) {
    console.error('Failed to fetch webhook failures count', err);
  }

  return <DashboardContent failedWebhooksCount={failedCount} />;
}
