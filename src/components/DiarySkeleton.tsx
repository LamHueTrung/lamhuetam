function ShimmerBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative ${className}`}
    >
      <div className="absolute inset-0 shimmer-slide" />
    </div>
  );
}

export function DiarySkeletonTimeline() {
  return (
    <div className="space-y-3 min-w-0">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[20px] p-4 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 min-w-0"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 shimmer-slide" />
            </div>
            <div className="flex-1 space-y-1.5">
              <ShimmerBar className="w-2/3 h-3" />
              <ShimmerBar className="w-1/3 h-2.5" />
            </div>
          </div>
          <div className="space-y-2">
            <ShimmerBar className="w-full h-3" />
            <ShimmerBar className="w-5/6 h-3" />
            <ShimmerBar className="w-2/3 h-3" />
          </div>
          <div className="flex gap-1.5 mt-3">
            <ShimmerBar className="w-14 h-5" />
            <ShimmerBar className="w-16 h-5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiarySkeletonTree() {
  return (
    <div className="space-y-3 min-w-0">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[20px] bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-4 flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 shimmer-slide" />
            </div>
            <ShimmerBar className="w-20 h-4" />
            <ShimmerBar className="w-10 h-4" />
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer-slide" />
                </div>
                <div className="flex-1 space-y-1">
                  <ShimmerBar className="w-3/4 h-3" />
                  <ShimmerBar className="w-1/2 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiarySkeletonCalendar() {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <ShimmerBar className="w-32 h-5" />
        <div className="flex gap-2">
          <ShimmerBar className="w-8 h-8" />
          <ShimmerBar className="w-8 h-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-slide" />
          </div>
        ))}
      </div>
    </div>
  );
}