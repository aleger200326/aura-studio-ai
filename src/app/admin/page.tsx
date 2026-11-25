import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect('/admin/login');
  }

  return <AdminDashboard />;
}
