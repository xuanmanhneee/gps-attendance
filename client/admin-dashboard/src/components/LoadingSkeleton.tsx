import React from 'react';

export interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'detail';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 3,
}) => {
  if (type === 'card') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="min-w-[260px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-3/5 bg-slate-200 rounded"></div>
                <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
              </div>
              <div className="h-4 w-4/5 bg-slate-100 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
              <div className="pt-2 flex gap-2">
                <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
                <div className="h-8 w-14 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full animate-pulse divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-4 gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
              <div className="h-3 w-1/4 bg-slate-100 rounded"></div>
            </div>
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  // Detail view skeleton
  return (
    <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
      <div className="h-4 w-24 bg-slate-200 rounded"></div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="h-7 w-1/3 bg-slate-200 rounded"></div>
          <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="h-16 bg-slate-100 rounded-lg"></div>
          <div className="h-16 bg-slate-100 rounded-lg"></div>
          <div className="h-16 bg-slate-100 rounded-lg"></div>
          <div className="h-16 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};
