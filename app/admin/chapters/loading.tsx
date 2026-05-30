import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminChaptersLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-10 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
