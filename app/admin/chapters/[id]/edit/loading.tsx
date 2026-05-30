import { Skeleton } from '@/components/ui/Skeleton';

export default function EditChapterLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-10 h-12 w-3/4" />
      <Skeleton className="mt-4 h-6 w-full" />
      <div className="mt-12 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
