import React from "react";

function ShimmerBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative ${className}`}
    >
      <div className="absolute inset-0 shimmer-slide" />
    </div>
  );
}

export function ImageSkeletonPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700 overflow-hidden relative ${className}`}
    >
      <div className="absolute inset-0 shimmer-slide" />
    </div>
  );
}

export function DiarySkeletonFeedPost() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-3 sm:p-4 space-y-3 overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 shimmer-slide" />
        </div>
        <div className="flex-1 space-y-1.5">
          <ShimmerBar className="w-1/3 h-3.5" />
          <ShimmerBar className="w-1/4 h-2.5" />
        </div>
      </div>

      {/* Content Text Skeleton */}
      <div className="space-y-2 py-1">
        <ShimmerBar className="w-full h-3" />
        <ShimmerBar className="w-4/5 h-3" />
        <ShimmerBar className="w-2/3 h-3" />
      </div>

      {/* Image Block Skeleton */}
      <div className="h-48 sm:h-64 rounded-xl bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
        <div className="absolute inset-0 shimmer-slide" />
      </div>

      {/* Footer Actions Skeleton */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <ShimmerBar className="w-20 h-4" />
        <ShimmerBar className="w-20 h-4" />
        <ShimmerBar className="w-20 h-4" />
      </div>
    </div>
  );
}

export function DiarySkeletonTimeline() {
  return (
    <div className="space-y-4 min-w-0">
      {[1, 2, 3].map((i) => (
        <DiarySkeletonFeedPost key={i} />
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