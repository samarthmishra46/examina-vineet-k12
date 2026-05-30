'use client';

import { PageError } from '@/components/ui/PageError';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      title="Couldn't load this page"
      message={error.message || 'Something went wrong while loading. Try again.'}
      onRetry={reset}
    />
  );
}
