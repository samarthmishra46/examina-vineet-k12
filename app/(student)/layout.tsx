import { Types } from 'mongoose';
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
  void params; // unused but Next.js passes it
  const user = await requireAuth();
  await connectMongoose();

  const profile = await StudentProfile.findOne({
    userId: new Types.ObjectId(user.id),
  })
    .select('_id')
    .lean();

  if (!profile) {
    redirect('/onboarding');
  }

  return <StudentShell>{children}</StudentShell>;
}
