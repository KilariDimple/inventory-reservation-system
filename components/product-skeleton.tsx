import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="h-48 rounded-none" />

      {/* Header skeleton */}
      <div className="p-6 pb-3 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Content skeleton */}
      <div className="px-6 pb-4 space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="p-6 pt-0">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
