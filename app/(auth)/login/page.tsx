import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { Button } from '@/components/ui/Button';
import { getCurrentUser } from '@/lib/auth/helpers';

export const metadata: Metadata = {
  title: 'Sign in · Examina',
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === 'admin' ? '/admin/chapters' : '/dashboard');

  async function signInWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: '/post-login' });
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 shadow-sm">
        <h1 className="font-display text-3xl tracking-tight text-ink">Sign in to Examina</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Continue with your Google account to start learning.
        </p>
        <form action={signInWithGoogle} className="mt-8">
          <Button type="submit" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
