import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { getCurrentUser } from '@/lib/auth/helpers';
import { Subscription, connectMongoose } from '@/lib/db/models';
import { SubscribeClient } from './SubscribeClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Start Free Trial · Examina' };

export default async function SubscribePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await connectMongoose();

  const subscription = await Subscription.findOne({
    userId: new Types.ObjectId(user.id),
  }).lean();

  // Already active — send them in
  if (subscription) {
    const now = new Date();
    const isActive =
      subscription.status === 'active' ||
      subscription.status === 'authenticated' ||
      (subscription.trialEndDate && subscription.trialEndDate > now);
    if (isActive) redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <SubscribeClient
        userEmail={user.email ?? ''}
        userName={user.name ?? ''}
      />
    </div>
  );
}
