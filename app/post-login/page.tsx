import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * Bouncer page: after Google OAuth completes, send the user to the right
 * landing based on role. Avoids putting role logic in the login redirect URL.
 */
export default async function PostLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(user.role === 'admin' ? '/admin/chapters' : '/dashboard');
}
