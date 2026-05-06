/**
 * useHighlightedLoad.ts
 * Hook to handle load highlighting from query params
 * Automatically highlights a load for 5 seconds after creation
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface UseHighlightedLoadOptions {
  duration?: number; // milliseconds (default: 5000)
}

export function useHighlightedLoad(options: UseHighlightedLoadOptions = {}) {
  const { duration = 5000 } = options;
  const [location] = useLocation();
  const [highlightedLoadId, setHighlightedLoadId] = useState<number | null>(null);

  useEffect(() => {
    // Extract highlight param from URL
    const url = new URL(window.location.href);
    const highlightParam = url.searchParams.get("highlight");

    if (highlightParam) {
      const loadId = parseInt(highlightParam, 10);
      if (!isNaN(loadId)) {
        setHighlightedLoadId(loadId);

        // Auto-clear highlight after duration
        const timer = setTimeout(() => {
          setHighlightedLoadId(null);
          // Clean up URL
          url.searchParams.delete("highlight");
          window.history.replaceState({}, "", url.toString());
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [location, duration]);

  return { highlightedLoadId };
}
