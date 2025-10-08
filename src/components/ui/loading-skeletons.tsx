import React from 'react';
import { Skeleton, ShimmerSkeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  showImage?: boolean;
  lines?: number;
  shimmer?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className,
  showImage = false,
  lines = 3,
  shimmer = false,
}) => {
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      {showImage && <SkeletonComponent variant="rounded" className="w-full h-48" />}
      <SkeletonComponent variant="text" className="w-3/4 h-6" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonComponent key={i} variant="text" className="w-full" />
      ))}
    </div>
  );
};

interface TableSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
  shimmer?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  className,
  rows = 5,
  columns = 4,
  shimmer = false,
}) => {
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonComponent key={i} variant="text" className="flex-1 h-5" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonComponent key={colIndex} variant="text" className="flex-1 h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

interface ListSkeletonProps {
  className?: string;
  items?: number;
  showAvatar?: boolean;
  shimmer?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  className,
  items = 5,
  showAvatar = false,
  shimmer = false,
}) => {
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          {showAvatar && <SkeletonComponent variant="circular" className="w-12 h-12" />}
          <div className="flex-1 space-y-2">
            <SkeletonComponent variant="text" className="w-3/4 h-5" />
            <SkeletonComponent variant="text" className="w-1/2 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface DeviceCardSkeletonProps {
  className?: string;
  shimmer?: boolean;
}

export const DeviceCardSkeleton: React.FC<DeviceCardSkeletonProps> = ({
  className,
  shimmer = false,
}) => {
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonComponent variant="circular" className="w-10 h-10" />
          <div className="space-y-2">
            <SkeletonComponent variant="text" className="w-32 h-5" />
            <SkeletonComponent variant="text" className="w-24 h-4" />
          </div>
        </div>
        <SkeletonComponent variant="rounded" className="w-16 h-6" />
      </div>
      
      {/* Switches */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <SkeletonComponent variant="text" className="w-24 h-4" />
            <SkeletonComponent variant="rounded" className="w-12 h-6" />
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <SkeletonComponent variant="rounded" className="flex-1 h-9" />
        <SkeletonComponent variant="rounded" className="flex-1 h-9" />
      </div>
    </div>
  );
};

interface FormSkeletonProps {
  className?: string;
  fields?: number;
  shimmer?: boolean;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  className,
  fields = 4,
  shimmer = false,
}) => {
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonComponent variant="text" className="w-24 h-4" />
          <SkeletonComponent variant="rounded" className="w-full h-12" />
        </div>
      ))}
      <div className="flex gap-2 justify-end">
        <SkeletonComponent variant="rounded" className="w-24 h-10" />
        <SkeletonComponent variant="rounded" className="w-24 h-10" />
      </div>
    </div>
  );
};
