import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { isLoadRouteBlocked } from "@/lib/load-route-helpers";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useDispatchFilters } from "@/hooks/useDispatchFilters";
import { useLoadAdvice } from "@/hooks/useLoadAdvice";
import DispatchFilterPanel from "@/components/dispatch/DispatchFilterPanel";
import DispatchKPIStrip from "@/components/dispatch/DispatchKPIStrip";
import DispatchKanbanBoard from "@/components/dispatch/DispatchKanbanBoard";
import DispatchTableView from "@/components/dispatch/DispatchTableView";

type ViewMode = "kanban" | "table";
type AIRecommendationFilter = "all" | "accept" | "negotiate" | "reject" | "blocked";

export default function DispatchBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [aiFilter, setAIFilter] = useState<AIRecommendationFilter>("all");

  const { filters, setFilters, applyQuickView, isLoaded } = useDispatchFilters();

  const query = trpc.loads.list.useQuery(
    {
      status: filters.status.length === 1 ? filters.status[0] : undefined,
    },
    {
      refetchInterval: 30000,
      retry: false,
    }
  );

  const rawData = query.data;

  // DIAGNOSTIC LOGGING
  console.log("[DispatchBoard] rawData:", rawData);
  console.log("[DispatchBoard] filters:", filters);

  const loads = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray((rawData as any).loads)) return (rawData as any).loads;
    if (rawData && Array.isArray((rawData as any).items)) return (rawData as any).items;
    return [];
  }, [rawData]);

  // Fetch AI advice for all loads
  const loadIds = useMemo(() => loads.map((l: any) => l.id), [loads]);
  const { adviceMap, isLoading: isLoadingAdvice } = useLoadAdvice(loadIds);

  const filteredLoads = useMemo(() => {
    console.log("[DispatchBoard] loads.length:", loads.length);
    console.log("[DispatchBoard] loads sample:", loads.slice(0, 3).map((l: any) => ({ id: l.id, status: l.status, price: l.price })));
    return loads.filter((load: any) => {
      const snapshot = load.financialSnapshot || {
        margin: 0,
        profit: 0,
        ratePerMile: 0,
        status: "loss",
        routeStatus: "missing_coords" as const,
        distanceSource: "fallback_120" as const,
        distanceConfidence: "low" as const,
        isDecisionBlocked: true,
        profitIsReliable: false,
      };

      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(String(load.status || ""));

      const matchesSearch =
        !filters.search ||
        String(load.id || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.clientName || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.merchandiseType || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.pickupAddress || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.deliveryAddress || "").toLowerCase().includes(filters.search.toLowerCase());

      const margin = Number(snapshot.margin || 0);
      // 🚨 CRITICAL: Don't exclude fallback loads by margin filter
      // Fallback loads have unreliable margins, so show them anyway with warning badge
      const isUsingFallback = snapshot.distanceSource === "fallback_120";
      const matchesMargin = isUsingFallback || (margin >= filters.marginRange[0] && margin <= filters.marginRange[1]);

      // Apply data quality filter
      const isMissingRoute = snapshot.isDecisionBlocked || isUsingFallback || snapshot.distanceConfidence === "low";
      const matchesDataQuality = 
        filters.dataQuality === "all" ||
        (filters.dataQuality === "reliable" && !isMissingRoute) ||
        (filters.dataQuality === "missing" && isMissingRoute);

      // Apply AI recommendation filter
      if (aiFilter !== "all") {
        const advice = adviceMap.get(load.id);
        if (aiFilter === "blocked") {
          // Show ONLY route/data blocked loads (not economically rejected)
          if (!isLoadRouteBlocked(load, advice)) {
            return false;
          }
        } else {
          // Show loads matching the recommendation (ACCEPT, NEGOTIATE, REJECT)
          if (!advice || !advice.recommendation) {
            return false;
          }
          const normalizedRecommendation = advice.recommendation.toUpperCase();
          const normalizedFilter = aiFilter.toUpperCase();
          
          // Reject filter should NOT show route-blocked loads
          if (normalizedFilter === "REJECT" && isLoadRouteBlocked(load, advice)) {
            return false;
          }
          
          if (normalizedRecommendation !== normalizedFilter) {
            return false;
          }
        }
      }

      return matchesStatus && matchesSearch && matchesMargin && matchesDataQuality;
    });
  }, [loads, filters, adviceMap, aiFilter]);

  // Log filtered results
  console.log("[DispatchBoard] filteredLoads.length:", filteredLoads.length);
  console.log("[DispatchBoard] filters.status:", filters.status);
  console.log("[DispatchBoard] filters.marginRange:", filters.marginRange);

  // Compute KPI metrics
  const totalLoads = filteredLoads.length;
  const avgMargin = totalLoads > 0
    ? filteredLoads.reduce((sum: number, load: any) => sum + (Number(load.financialSnapshot?.margin || 0)), 0) / totalLoads
    : 0;

  const atRiskCount = filteredLoads.filter((load: any) => {
    const margin = Number(load.financialSnapshot?.margin || 0);
    return margin < 15 && margin >= 0;
  }).length;

  const blockedCount = filteredLoads.filter((load: any) => {
    const advice = adviceMap.get(load.id);
    return isLoadRouteBlocked(load, advice);
  }).length;

  const pendingCount = filteredLoads.filter((load: any) => load.status === "quoted").length;

  const alertCount = atRiskCount + blockedCount;

  if (!isLoaded || query.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <DispatchFilterPanel filters={filters} setFilters={setFilters} />

      <DispatchKPIStrip
        totalLoads={totalLoads}
        avgMargin={avgMargin}
        atRisk={atRiskCount}
        blocked={blockedCount}
        pending={pendingCount}
        alerts={alertCount}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-6 py-3 border-b">
          <span className="text-sm font-medium text-muted-foreground">AI Advisor:</span>
          <Button
            variant={aiFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setAIFilter("all")}
          >
            All
          </Button>
          <Button
            variant={aiFilter === "accept" ? "default" : "outline"}
            size="sm"
            onClick={() => setAIFilter("accept")}
          >
            Accept
          </Button>
          <Button
            variant={aiFilter === "negotiate" ? "default" : "outline"}
            size="sm"
            onClick={() => setAIFilter("negotiate")}
          >
            Negotiate
          </Button>
          <Button
            variant={aiFilter === "reject" ? "default" : "outline"}
            size="sm"
            onClick={() => setAIFilter("reject")}
          >
            Reject
          </Button>
          <Button
            variant={aiFilter === "blocked" ? "default" : "outline"}
            size="sm"
            onClick={() => setAIFilter("blocked")}
          >
            🚫 Blocked
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === "kanban" ? (
            <DispatchKanbanBoard
              loads={filteredLoads}
              selectedLoadId={selectedLoadId}
              onSelectLoad={setSelectedLoadId}
              adviceMap={adviceMap}
            />
          ) : (
            <DispatchTableView
              loads={filteredLoads}
              selectedLoadId={selectedLoadId}
              onSelectLoad={setSelectedLoadId}
              adviceMap={adviceMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}
