import { StudentShell } from '@/components/student/StudentShell';
import { requireAuth } from '@/lib/auth/helpers';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <StudentShell>{children}</StudentShell>;
}
