import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useDispatchFilters } from "@/hooks/useDispatchFilters";
import { useLoadAdvice } from "@/hooks/useLoadAdvice";
import DispatchFilterPanel from "@/components/dispatch/DispatchFilterPanel";
import DispatchKPIStrip from "@/components/dispatch/DispatchKPIStrip";
import DispatchKanbanBoard from "@/components/dispatch/DispatchKanbanBoard";
import DispatchTableView from "@/components/dispatch/DispatchTableView";
import { useMemo, useState } from "react";

type ViewMode = "kanban" | "table";
type AIRecommendationFilter = "all" | "accept" | "negotiate" | "reject" | "blocked";

const DISPATCH_DEBUG_VERSION = "filter-debug-v2-first5loads";

// ============================================================
// STEP 1: NORMALIZED HELPERS
// ============================================================

function normalizeRecommendation(advice: any): string {
  return String(advice?.recommendation || "")
    .trim()
    .toLowerCase();
}

function hasValidCoordinates(load: any): boolean {
  const pickupLat = Number(load.pickupLat);
  const pickupLng = Number(load.pickupLng);
  const deliveryLat = Number(load.deliveryLat);
  const deliveryLng = Number(load.deliveryLng);

  return (
    Number.isFinite(pickupLat) &&
    Number.isFinite(pickupLng) &&
    Number.isFinite(deliveryLat) &&
    Number.isFinite(deliveryLng) &&
    pickupLat !== 0 &&
    pickupLng !== 0 &&
    deliveryLat !== 0 &&
    deliveryLng !== 0
  );
}

function getRouteBlockedReason(load: any, advice: any): string | null {
  const rec = normalizeRecommendation(advice);
  const hasValidCoords = hasValidCoordinates(load);
  const snapshot = load?.financialSnapshot;

  if (rec === "blocked") return "advice_recommendation_blocked";
  if (rec === "unknown") return "advice_recommendation_unknown";
  if (advice?.status === "blocked") return "advice_status_blocked";
  if (advice?.blockedReason) return "advice_blockedReason";
  if (snapshot?.isDecisionBlocked === true) return "snapshot_isDecisionBlocked";
  if (snapshot?.routeStatus === "missing_coords") return "snapshot_routeStatus_missing_coords";
  if (snapshot?.routeStatus === "invalid") return "snapshot_routeStatus_invalid";
  if (snapshot?.routeStatus === "fallback") return "snapshot_routeStatus_fallback";
  if (snapshot?.distanceSource === "fallback_120") return "snapshot_distanceSource_fallback_120";
  if (snapshot?.distanceConfidence === "low") return "snapshot_distanceConfidence_low";
  if (!hasValidCoords && !snapshot?.profitIsReliable) return "missing_coords_without_reliable_snapshot";

  return null;
}

function isRouteBlocked(load: any, advice: any): boolean {
  const reason = getRouteBlockedReason(load, advice);
  return reason !== null;
}

function getEconomicRecommendation(advice: any): string {
  const rec = normalizeRecommendation(advice);

  if (rec === "accept") return "accept";
  if (rec === "negotiate") return "negotiate";
  if (rec === "reject") return "reject";
  if (rec === "blocked") return "blocked";

  return "unknown";
}

/**
 * Get the display recommendation for UI rendering.
 * CRITICAL: Route-blocked loads must ALWAYS show BLOCKED badge,
 * never REJECT, even if profit is low.
 */
function getDisplayRecommendation(load: any, advice: any): string {
  // If route is blocked, ALWAYS show "blocked" regardless of economics
  if (isRouteBlocked(load, advice)) {
    return "blocked";
  }

  // Otherwise, show the economic recommendation
  return getEconomicRecommendation(advice);
}

function getAdviceForLoad(adviceMap: any, loadId: any): any {
  if (!adviceMap) return undefined;
  if (typeof adviceMap.get === "function") return adviceMap.get(loadId);
  return adviceMap[loadId] || adviceMap[String(loadId)];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

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

  const loads = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray((rawData as any).loads)) return (rawData as any).loads;
    if (rawData && Array.isArray((rawData as any).items)) return (rawData as any).items;
    return [];
  }, [rawData]);

  // Fetch AI advice for all loads
  const loadIds = useMemo(() => loads.map((l: any) => l.id), [loads]);
  const { adviceMap, isLoading: isLoadingAdvice } = useLoadAdvice(loadIds);

  // Safe fallback snapshot for display only (no route metadata)
  const safeSnapshot = {
    margin: 0,
    profit: 0,
    ratePerMile: 0,
    status: "loss" as const,
    profitIsReliable: false,
  };

  // ============================================================
  // STEP 2: EXPLICIT STATE MACHINE FILTER LOGIC
  // ============================================================

  const filteredLoads = useMemo(() => {
    return loads.filter((load: any) => {
      // Get snapshot for display values only
      const snapshot = load.financialSnapshot || safeSnapshot;

      // BASE FILTERS: Check these first
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
      const matchesMargin = margin >= filters.marginRange[0] && margin <= filters.marginRange[1];

      // Compute route quality once
      const advice = getAdviceForLoad(adviceMap, load.id);
      const routeBlocked = isRouteBlocked(load, advice);
      const economicRecommendation = getEconomicRecommendation(advice);

      // Data quality filter
      const matchesDataQuality =
        filters.dataQuality === "all" ||
        (filters.dataQuality === "reliable" && !routeBlocked) ||
        (filters.dataQuality === "missing" && routeBlocked);

      // Apply base filters first
      const baseMatches = matchesStatus && matchesSearch && matchesMargin && matchesDataQuality;

      if (!baseMatches) return false;

      // EXPLICIT STATE MACHINE: Apply AI recommendation filter
      switch (aiFilter) {
        case "all":
          return true;

        case "blocked":
          return routeBlocked === true;

        case "accept":
          return routeBlocked === false && economicRecommendation === "accept";

        case "negotiate":
          return routeBlocked === false && economicRecommendation === "negotiate";

        case "reject":
          return routeBlocked === false && economicRecommendation === "reject";

        default:
          return true;
      }
    });
  }, [loads, filters, adviceMap, aiFilter]);

  // Calculate KPIs
  const blockedCount = useMemo(() => {
    return loads.filter((load: any) => {
      const advice = getAdviceForLoad(adviceMap, load.id);
      return isRouteBlocked(load, advice);
    }).length;
  }, [loads, adviceMap]);

  // DEBUG: Calculate counts for each filter
  const debugCounts = useMemo(() => {
    const allCount = loads.length;
    const acceptCount = loads.filter((load: any) => {
      const advice = getAdviceForLoad(adviceMap, load.id);
      const routeBlocked = isRouteBlocked(load, advice);
      const economicRecommendation = getEconomicRecommendation(advice);
      return routeBlocked === false && economicRecommendation === "accept";
    }).length;
    const negotiateCount = loads.filter((load: any) => {
      const advice = getAdviceForLoad(adviceMap, load.id);
      const routeBlocked = isRouteBlocked(load, advice);
      const economicRecommendation = getEconomicRecommendation(advice);
      return routeBlocked === false && economicRecommendation === "negotiate";
    }).length;
    const rejectCount = loads.filter((load: any) => {
      const advice = getAdviceForLoad(adviceMap, load.id);
      const routeBlocked = isRouteBlocked(load, advice);
      const economicRecommendation = getEconomicRecommendation(advice);
      return routeBlocked === false && economicRecommendation === "reject";
    }).length;
    const blockedCountDebug = loads.filter((load: any) => {
      const advice = getAdviceForLoad(adviceMap, load.id);
      return isRouteBlocked(load, advice);
    }).length;
    return { allCount, acceptCount, negotiateCount, rejectCount, blockedCountDebug };
  }, [loads, adviceMap]);

  const isLoading = query.isLoading || isLoadingAdvice;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen gap-4 p-4 bg-background">
      {/* Left Panel - Filters */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto">
        <DispatchFilterPanel filters={filters} onFilterChange={setFilters} onApplyQuickView={applyQuickView} />
      </div>

      {/* Right Panel - Main Content */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dispatch Board</h1>
          <p className="text-sm text-muted-foreground">Centro operacional para monitorear cargas, márgenes y estado de dispatch.</p>
        </div>

        {/* KPI Strip */}
        <DispatchKPIStrip loads={filteredLoads} blockedCount={blockedCount} />

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Table
          </Button>
        </div>

        {/* DEBUG: Version Marker */}
        <div className="text-xs text-muted-foreground">
          Dispatch Debug Version: <strong>{DISPATCH_DEBUG_VERSION}</strong>
        </div>

        {/* DEBUG: Filter Counts Display */}
        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs font-mono">
          <div>Active AI Filter: <strong>{aiFilter}</strong></div>
          <div>Counts:</div>
          <div>All: {debugCounts.allCount}</div>
          <div>Accept: {debugCounts.acceptCount}</div>
          <div>Negotiate: {debugCounts.negotiateCount}</div>
          <div>Reject: {debugCounts.rejectCount}</div>
          <div>Blocked: {debugCounts.blockedCountDebug}</div>
        </div>

        {/* DEBUG: First 5 Filtered Loads Debug */}
        {filteredLoads.slice(0, 5).length > 0 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs font-mono overflow-x-auto">
            <div className="font-bold mb-2">First 5 Filtered Loads:</div>
            {filteredLoads.slice(0, 5).map((load: any) => {
              const advice = getAdviceForLoad(adviceMap, load.id);
              const reason = getRouteBlockedReason(load, advice);
              const rec = getEconomicRecommendation(advice);
              return (
                <div key={load.id} className="mb-2 pb-2 border-b border-blue-200">
                  <div>#{load.id}: blocked={String(reason !== null)} reason={reason || "none"} rec={rec}</div>
                  <div>  distSrc={load.financialSnapshot?.distanceSource} profitRel={load.financialSnapshot?.profitIsReliable}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Advisor Filter */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium">AI Advisor:</span>
          {(["all", "accept", "negotiate", "reject", "blocked"] as const).map((filter) => (
            <Button
              key={filter}
              variant={aiFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setAIFilter(filter)}
            >
              {filter === "blocked" ? "🚫 Blocked" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : viewMode === "kanban" ? (
            <DispatchKanbanBoard loads={filteredLoads} selectedLoadId={selectedLoadId} onSelectLoad={setSelectedLoadId} />
          ) : (
            <DispatchTableView loads={filteredLoads} selectedLoadId={selectedLoadId} onSelectLoad={setSelectedLoadId} />
          )}
        </div>
      </div>
    </div>
  );
}
