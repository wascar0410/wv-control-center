import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface LoadAdviceData {
  recommendation: "accept" | "negotiate" | "reject";
  confidence: number;
  suggestedRate: number;
  reason: string[];
  riskFlags: string[];
  financials: {
    miles: number;
    ratePerMile: number;
    estimatedProfit: number;
    estimatedMargin: number;
    fuelCost: number;
    tolls: number;
    totalCost: number;
  };
}

/**
 * Hook to fetch load advice for multiple loads
 * Returns a map of loadId -> LoadAdviceData
 */
export function useLoadAdvice(loadIds: number[]) {
  const query = trpc.loads.getLoadAdviceBatch.useQuery(
    { loadIds },
    {
      enabled: loadIds.length > 0,
      staleTime: 60000, // 1 minute
      retry: false,
    }
  );

  const adviceMap = useMemo(() => {
    if (!query.data) return new Map<number, LoadAdviceData>();

    const map = new Map<number, LoadAdviceData>();
    for (const [loadIdStr, advice] of Object.entries(query.data)) {
      const loadId = parseInt(loadIdStr, 10);
      map.set(loadId, advice as LoadAdviceData);
    }
    return map;
  }, [query.data]);

  return {
    adviceMap,
    isLoading: query.isLoading,
    error: query.error,
  };
}
