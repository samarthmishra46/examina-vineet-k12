import { Skeleton } from '@/components/ui/Skeleton';

export default function ChapterLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-8 h-10 w-72" />
      <Skeleton className="mt-3 h-6 w-full" />
      <Skeleton className="mt-2 h-6 w-2/3" />
      <div className="mt-10 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
