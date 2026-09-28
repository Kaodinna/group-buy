export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border">
      <div className="aspect-4/3 bg-black/5 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/5" />
        <div className="h-4 w-1/2 rounded bg-black/5 dark:bg-white/5" />
        <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5" />
        <div className="h-9 w-full rounded-full bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
