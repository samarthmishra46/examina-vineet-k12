'use client';

import { PageError } from '@/components/ui/PageError';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      title="Something went wrong"
      message={error.message || 'An unexpected error happened. Try again, or head back home.'}
      onRetry={reset}
    />
  );
}
