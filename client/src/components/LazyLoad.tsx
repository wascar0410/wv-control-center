import React, { Suspense, ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  height?: string;
  className?: string;
}

/**
 * LazyLoad wrapper component that provides Suspense boundary with custom fallback
 * Used for lazy-loaded components like charts, maps, and heavy components
 */
export function LazyLoad({
  children,
  fallback,
  height = "h-96",
  className = "",
}: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <LazyLoadSkeleton height={height} />}>
      <div className={className}>{children}</div>
    </Suspense>
  );
}

/**
 * Default skeleton loader for lazy-loaded components
 */
export function LazyLoadSkeleton({ height = "h-96" }: { height?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className={`p-6 ${height}`}>
        <div className="space-y-4 h-full flex flex-col justify-between">
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Footer skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Chart skeleton loader - optimized for chart components
 */
export function ChartSkeleton({ height = "h-80" }: { height?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className={`p-6 ${height}`}>
        <div className="space-y-4 h-full">
          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>

          {/* Chart area */}
          <div className="flex-1 flex items-end justify-between gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 space-y-2">
                <Skeleton className={`h-${Math.random() > 0.5 ? "32" : "48"} w-full`} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Map skeleton loader - optimized for map components
 */
export function MapSkeleton({ height = "h-96" }: { height?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className={`p-6 ${height}`}>
        <div className="space-y-4 h-full">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>

          {/* Map area with grid pattern */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-full w-full rounded" />
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget skeleton loader - for small components like alerts
 */
export function WidgetSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className={`p-4 ${height}`}>
        <div className="space-y-3 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>

          {/* Items */}
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper function to create lazy-loaded component with proper error boundary
 */
export function createLazyComponent<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
  height?: string
) {
  const LazyComponent = React.lazy(() =>
    Promise.resolve({ default: Component })
  );

  return (props: P) => (
    <LazyLoad fallback={fallback} height={height}>
      <LazyComponent {...props} />
    </LazyLoad>
  );
}
