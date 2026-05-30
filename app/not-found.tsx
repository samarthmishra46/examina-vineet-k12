import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Not found · Examina',
};

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-5xl text-ink">Not found</p>
        <p className="mt-3 text-base text-inkMuted">
          We couldn&apos;t find that page. Try heading back home.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </div>
  );
}
