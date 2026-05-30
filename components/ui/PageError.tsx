'use client';

import { Button } from './Button';

interface PageErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function PageError({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: PageErrorProps) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-3xl text-ink">{title}</p>
        {message && <p className="mt-3 text-sm text-inkMuted">{message}</p>}
        {onRetry && (
          <Button onClick={onRetry} className="mt-6">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
