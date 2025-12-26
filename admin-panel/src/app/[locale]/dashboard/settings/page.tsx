import { verifyAdminAccess } from '@/lib/auth-server';
import ShopSettings from '@/components/settings/ShopSettings';

export default async function SettingsPage() {
  await verifyAdminAccess();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your shop settings
        </p>
      </div>

      <ShopSettings />
    </div>
  );
}
