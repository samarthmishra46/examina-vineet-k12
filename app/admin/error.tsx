'use client';

import { PageError } from '@/components/ui/PageError';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      title="Admin action failed"
      message={error.message || 'Something went wrong in the admin panel.'}
      onRetry={reset}
    />
  );
}
