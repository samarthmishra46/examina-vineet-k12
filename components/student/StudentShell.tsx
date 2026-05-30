import Link from 'next/link';
import { signOut } from '@/auth';
import { getCurrentUser } from '@/lib/auth/helpers';

export async function StudentShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/dashboard" className="text-sm font-medium tracking-tight">
            Examina
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-inkMuted sm:inline">{user?.email}</span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
