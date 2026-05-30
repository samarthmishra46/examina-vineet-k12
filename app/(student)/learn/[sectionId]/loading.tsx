import { Skeleton } from '@/components/ui/Skeleton';

export default function LearnLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-[700px] w-full" />
    </div>
  );
}
