import { redirect } from 'next/navigation';
import { StudentShell } from '@/components/student/StudentShell';
import { requireAuth } from '@/lib/auth/helpers';
import { StudentProfile, connectMongoose } from '@/lib/db/models';

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: Record<string, string>;
}) {
  void params;
  const user = await requireAuth();
  await connectMongoose();

  // ── Profile gate (onboarding) ────────────────────────────────────────────────
  const profile = await StudentProfile.findOne({ userId: user.id }).select('_id').lean();
  if (!profile) redirect('/onboarding');

  return <StudentShell>{children}</StudentShell>;
}
