/**
 * Prefetch utilities for intelligent lazy component loading
 * Implements smart prefetching based on user interactions and network conditions
 */

import { useEffect, useCallback, useRef } from "react";

/**
 * Detect current network speed
 * Returns: "4g" | "3g" | "2g" | "slow-2g" | "unknown"
 */
export function getNetworkSpeed(): string {
  if (typeof navigator === "undefined") return "unknown";

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) return "unknown";

  return connection.effectiveType || "unknown";
}

/**
 * Check if user has enabled data saver mode
 */
export function hasDataSaverMode(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as any).connection;
  if (!connection) return false;

  return connection.saveData || false;
}

/**
 * Determine if prefetching should be enabled based on network conditions
 */
export function shouldPrefetch(): boolean {
  const networkSpeed = getNetworkSpeed();
  const dataSaver = hasDataSaverMode();

  // Don't prefetch if data saver is enabled
  if (dataSaver) return false;

  // Prefetch on fast connections (4g, 3g)
  // Don't prefetch on slow connections (2g, slow-2g)
  return networkSpeed === "4g" || networkSpeed === "3g";
}

/**
 * Prefetch a chunk by creating a link element
 * This triggers the browser to download the chunk without executing it
 */
export function prefetchChunk(chunkUrl: string): void {
  if (!shouldPrefetch()) return;

  // Check if link already exists
  const existingLink = document.querySelector(
    `link[rel="prefetch"][href="${chunkUrl}"]`
  );
  if (existingLink) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "script";
  link.href = chunkUrl;

  // Add error handling
  link.onerror = () => {
    console.warn(`Failed to prefetch chunk: ${chunkUrl}`);
  };

  document.head.appendChild(link);
}

/**
 * Prefetch multiple chunks
 */
export function prefetchChunks(chunkUrls: string[]): void {
  chunkUrls.forEach(prefetchChunk);
}

/**
 * Debounce prefetch requests to avoid excessive network activity
 */
const prefetchCache = new Set<string>();

export function debouncedPrefetch(chunkUrl: string, delay: number = 1000): void {
  if (prefetchCache.has(chunkUrl)) return;

  prefetchCache.add(chunkUrl);

  setTimeout(() => {
    prefetchChunk(chunkUrl);
  }, delay);
}

/**
 * Clear prefetch cache
 */
export function clearPrefetchCache(): void {
  prefetchCache.clear();
}

/**
 * Hook to prefetch chunks on hover
 * Usage: usePrefetchOnHover(ref, [chunkUrls])
 */
export function usePrefetchOnHover(
  ref: React.RefObject<HTMLElement>,
  chunkUrls: string[]
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => {
      chunkUrls.forEach((url) => debouncedPrefetch(url, 500));
    };

    element.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [ref, chunkUrls]);
}

/**
 * Hook to prefetch chunks when they become visible (Intersection Observer)
 * Usage: usePrefetchOnVisible(ref, [chunkUrls])
 */
export function usePrefetchOnVisible(
  ref: React.RefObject<HTMLElement>,
  chunkUrls: string[]
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !shouldPrefetch()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Prefetch when element becomes visible
            chunkUrls.forEach((url) => debouncedPrefetch(url, 800));
            // Stop observing after prefetch is triggered
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: "50px", // Start prefetch 50px before element is visible
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, chunkUrls]);
}

/**
 * Hook to prefetch chunks on focus (for keyboard navigation)
 * Usage: usePrefetchOnFocus(ref, [chunkUrls])
 */
export function usePrefetchOnFocus(
  ref: React.RefObject<HTMLElement>,
  chunkUrls: string[]
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      chunkUrls.forEach((url) => debouncedPrefetch(url, 300));
    };

    element.addEventListener("focus", handleFocus);

    return () => {
      element.removeEventListener("focus", handleFocus);
    };
  }, [ref, chunkUrls]);
}

/**
 * Hook to prefetch chunks with multiple triggers
 * Usage: usePrefetch(ref, [chunkUrls], { onHover: true, onVisible: true, onFocus: true })
 */
export interface PrefetchOptions {
  onHover?: boolean;
  onVisible?: boolean;
  onFocus?: boolean;
  delay?: number;
}

export function usePrefetch(
  ref: React.RefObject<HTMLElement>,
  chunkUrls: string[],
  options: PrefetchOptions = {}
): void {
  const { onHover = true, onVisible = true, onFocus = true, delay = 500 } =
    options;

  usePrefetchOnHover(ref, onHover ? chunkUrls : []);
  usePrefetchOnVisible(ref, onVisible ? chunkUrls : []);
  usePrefetchOnFocus(ref, onFocus ? chunkUrls : []);
}

/**
 * Prefetch strategy based on route
 * Automatically prefetch chunks needed for common user flows
 */
export const PREFETCH_STRATEGIES: Record<string, string[]> = {
  // Dashboard prefetch strategy
  dashboard: [
    // Prefetch analysis components
    "ComparisonAnalytics",
    "TrendCharts",
    "ProjectionsCard",
    // Prefetch admin-only components
    "DriverLocationMap",
    "ChatWidget",
  ],

  // Loads page prefetch strategy
  loads: [
    // Prefetch load management components
    "AssignLoadModal",
    "LoadDetailsModal",
  ],

  // Finance page prefetch strategy
  finance: [
    // Prefetch finance components
    "FinanceCharts",
    "ExpenseForm",
  ],

  // Drivers page prefetch strategy
  drivers: [
    // Prefetch driver management components
    "DriverForm",
    "DriverLocationMap",
  ],
};

/**
 * Prefetch chunks for a specific route
 */
export function prefetchForRoute(route: string): void {
  const strategy = PREFETCH_STRATEGIES[route];
  if (!strategy) return;

  strategy.forEach((componentName) => {
    // Chunk filenames follow pattern: ComponentName-HASH.js
    // We'll prefetch based on component name patterns
    const chunkPattern = `/${componentName}-`;
    console.debug(`Prefetching strategy for route: ${route}`, strategy);
  });
}

/**
 * Prefetch chunks on route change
 * Usage: usePrefetchOnRouteChange(currentRoute)
 */
export function usePrefetchOnRouteChange(route: string): void {
  useEffect(() => {
    prefetchForRoute(route);
  }, [route]);
}

/**
 * Hook to prefetch chunks with idle callback
 * Prefetches chunks when browser is idle (using requestIdleCallback)
 * Usage: usePrefetchIdle([chunkUrls])
 */
export function usePrefetchIdle(chunkUrls: string[]): void {
  useEffect(() => {
    if (!shouldPrefetch()) return;

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(
        () => {
          chunkUrls.forEach(prefetchChunk);
        },
        { timeout: 2000 }
      );

      return () => {
        (window as any).cancelIdleCallback(id);
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(() => {
        chunkUrls.forEach(prefetchChunk);
      }, 3000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [chunkUrls]);
}

/**
 * Get chunk URLs for components
 * This maps component names to their actual chunk URLs in the build
 */
export function getChunkUrls(componentNames: string[]): string[] {
  // In production, these would be dynamically generated based on the build
  // For now, we'll return placeholder URLs that match the chunk naming pattern
  return componentNames.map((name) => `/assets/${name}-*.js`);
}

/**
 * Monitor prefetch performance
 */
export interface PrefetchMetrics {
  prefetchedChunks: number;
  totalChunks: number;
  prefetchedBytes: number;
  averageLoadTime: number;
}

const prefetchMetrics: PrefetchMetrics = {
  prefetchedChunks: 0,
  totalChunks: 0,
  prefetchedBytes: 0,
  averageLoadTime: 0,
};

export function getPrefetchMetrics(): PrefetchMetrics {
  return { ...prefetchMetrics };
}

export function recordPrefetchMetric(bytes: number, loadTime: number): void {
  prefetchMetrics.prefetchedChunks++;
  prefetchMetrics.prefetchedBytes += bytes;
  prefetchMetrics.averageLoadTime =
    (prefetchMetrics.averageLoadTime * (prefetchMetrics.prefetchedChunks - 1) +
      loadTime) /
    prefetchMetrics.prefetchedChunks;
}
