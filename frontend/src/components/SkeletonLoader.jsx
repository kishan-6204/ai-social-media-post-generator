function SkeletonLoader() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-4 w-1/3 rounded bg-slate-300/30 dark:bg-slate-700/40 animate-shimmer" />
      <div className="h-4 w-full rounded bg-slate-300/30 dark:bg-slate-700/40 animate-shimmer" />
      <div className="h-4 w-11/12 rounded bg-slate-300/30 dark:bg-slate-700/40 animate-shimmer" />
      <div className="h-4 w-3/4 rounded bg-slate-300/30 dark:bg-slate-700/40 animate-shimmer" />
    </div>
  );
}

export default SkeletonLoader;
