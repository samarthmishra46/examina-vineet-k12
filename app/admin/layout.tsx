import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/auth/helpers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
