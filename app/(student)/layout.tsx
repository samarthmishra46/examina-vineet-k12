import { Types } from 'mongoose';
import { redirect } from 'next/navigation';
import { StudentShell } from '@/components/student/StudentShell';
import { requireAuth } from '@/lib/auth/helpers';
import { Subscription, StudentProfile, connectMongoose } from '@/lib/db/models';

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

  const userId = new Types.ObjectId(user.id);

  // ── Subscription gate ────────────────────────────────────────────────────────
  const subscription = await Subscription.findOne({ userId }).lean();
  const now = new Date();
  const isSubscribed =
    subscription &&
    (subscription.status === 'active' ||
      subscription.status === 'authenticated' ||
      (subscription.trialEndDate && subscription.trialEndDate > now));

  if (!isSubscribed) redirect('/subscribe');

  // ── Profile gate (onboarding) ────────────────────────────────────────────────
  const profile = await StudentProfile.findOne({ userId }).select('_id').lean();
  if (!profile) redirect('/onboarding');

  return <StudentShell>{children}</StudentShell>;
}
