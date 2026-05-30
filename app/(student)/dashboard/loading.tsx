import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-64" />
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}
