import { Skeleton } from "@/components/ui/skeleton";

export const PostCardSkeleton = () => (
  <div className="rounded-xl border bg-card overflow-hidden">
    <div className="p-4 pb-2">
      <Skeleton className="h-5 w-3/4" />
    </div>
    <Skeleton className="w-full" style={{ aspectRatio: "4/5" }} />
    <div className="p-4 space-y-2">
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  </div>
);
