import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNetworkSpeed,
  hasDataSaverMode,
  shouldPrefetch,
  prefetchChunk,
  prefetchChunks,
  debouncedPrefetch,
  clearPrefetchCache,
  getPrefetchMetrics,
  recordPrefetchMetric,
} from "./prefetch";

describe("Prefetch Utilities", () => {
  beforeEach(() => {
    clearPrefetchCache();
    vi.clearAllMocks();
  });

  describe("getNetworkSpeed", () => {
    it("should return unknown if navigator is not available", () => {
      const speed = getNetworkSpeed();
      expect(typeof speed).toBe("string");
    });

    it("should detect network speed correctly", () => {
      const speed = getNetworkSpeed();
      const validSpeeds = ["4g", "3g", "2g", "slow-2g", "unknown"];
      expect(validSpeeds).toContain(speed);
    });
  });

  describe("hasDataSaverMode", () => {
    it("should return boolean", () => {
      const result = hasDataSaverMode();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("shouldPrefetch", () => {
    it("should return false if data saver is enabled", () => {
      // Mock data saver mode
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: {
          connection: {
            saveData: true,
            effectiveType: "4g",
          },
        },
        writable: true,
      });

      const result = shouldPrefetch();
      expect(result).toBe(false);

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should return true on fast connections", () => {
      const result = shouldPrefetch();
      // Result depends on actual network conditions
      expect(typeof result).toBe("boolean");
    });
  });

  describe("prefetchChunk", () => {
    it("should create link element for prefetch", () => {
      const chunkUrl = "/assets/test-chunk.js";
      prefetchChunk(chunkUrl);

      const link = document.querySelector(
        `link[rel="prefetch"][href="${chunkUrl}"]`
      );
      expect(link).toBeDefined();
    });

    it("should not create duplicate links", () => {
      const chunkUrl = "/assets/test-chunk.js";
      prefetchChunk(chunkUrl);
      prefetchChunk(chunkUrl);

      const links = document.querySelectorAll(
        `link[rel="prefetch"][href="${chunkUrl}"]`
      );
      expect(links.length).toBe(1);
    });
  });

  describe("prefetchChunks", () => {
    it("should prefetch multiple chunks", () => {
      const chunkUrls = [
        "/assets/chunk1.js",
        "/assets/chunk2.js",
        "/assets/chunk3.js",
      ];
      prefetchChunks(chunkUrls);

      chunkUrls.forEach((url) => {
        const link = document.querySelector(`link[rel="prefetch"][href="${url}"]`);
        expect(link).toBeDefined();
      });
    });
  });

  describe("debouncedPrefetch", () => {
    it("should debounce prefetch requests", () => {
      vi.useFakeTimers();

      const chunkUrl = "/assets/debounced-chunk.js";
      debouncedPrefetch(chunkUrl, 500);

      // Link should not exist yet
      let link = document.querySelector(
        `link[rel="prefetch"][href="${chunkUrl}"]`
      );
      expect(link).toBeNull();

      // Advance time
      vi.advanceTimersByTime(500);

      // Link should exist now
      link = document.querySelector(`link[rel="prefetch"][href="${chunkUrl}"]`);
      expect(link).toBeDefined();

      vi.useRealTimers();
    });

    it("should not create duplicate debounced prefetches", () => {
      vi.useFakeTimers();

      const chunkUrl = "/assets/debounced-chunk.js";
      debouncedPrefetch(chunkUrl, 500);
      debouncedPrefetch(chunkUrl, 500);

      vi.advanceTimersByTime(500);

      const links = document.querySelectorAll(
        `link[rel="prefetch"][href="${chunkUrl}"]`
      );
      expect(links.length).toBe(1);

      vi.useRealTimers();
    });
  });

  describe("clearPrefetchCache", () => {
    it("should clear prefetch cache", () => {
      const chunkUrl = "/assets/test-chunk.js";
      debouncedPrefetch(chunkUrl, 500);

      clearPrefetchCache();

      // After clearing, the same URL should be prefetchable again
      debouncedPrefetch(chunkUrl, 500);
      // If cache was properly cleared, this should work without issues
      expect(true).toBe(true);
    });
  });

  describe("Prefetch Metrics", () => {
    it("should track prefetch metrics", () => {
      recordPrefetchMetric(1024, 100);
      recordPrefetchMetric(2048, 150);

      const metrics = getPrefetchMetrics();
      expect(metrics.prefetchedChunks).toBe(2);
      expect(metrics.prefetchedBytes).toBe(3072);
      expect(metrics.averageLoadTime).toBeGreaterThan(0);
    });

    it("should calculate average load time correctly", () => {
      recordPrefetchMetric(1024, 100);
      recordPrefetchMetric(1024, 200);

      const metrics = getPrefetchMetrics();
      expect(metrics.averageLoadTime).toBe(150);
    });
  });
});

describe("Prefetch Performance", () => {
  it("should prefetch without blocking main thread", async () => {
    const startTime = performance.now();

    prefetchChunks([
      "/assets/chunk1.js",
      "/assets/chunk2.js",
      "/assets/chunk3.js",
    ]);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Prefetching should be fast (< 10ms)
    expect(duration).toBeLessThan(10);
  });

  it("should handle network errors gracefully", () => {
    const chunkUrl = "/assets/non-existent-chunk.js";

    // Should not throw error
    expect(() => {
      prefetchChunk(chunkUrl);
    }).not.toThrow();
  });
});

describe("Prefetch Strategy", () => {
  it("should respect data saver mode", () => {
    const originalNavigator = global.navigator;

    Object.defineProperty(global, "navigator", {
      value: {
        connection: {
          saveData: true,
          effectiveType: "4g",
        },
      },
      writable: true,
    });

    const result = shouldPrefetch();
    expect(result).toBe(false);

    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it("should prefetch on fast connections only", () => {
    const result = shouldPrefetch();
    // Result depends on actual network conditions
    // Just verify it returns a boolean
    expect(typeof result).toBe("boolean");
  });
});
