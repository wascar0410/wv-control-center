"use client";

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

/**
 * Determine if a load's route/data is blocked or unreliable
 */
function getRouteQuality(load: any, advice: any) {
  const snapshot = load.financialSnapshot;

  // Check if coordinates are valid and non-zero
  const hasValidCoords =
    Number.isFinite(Number(load.pickupLat)) &&
    Number.isFinite(Number(load.pickupLng)) &&
    Number.isFinite(Number(load.deliveryLat)) &&
    Number.isFinite(Number(load.deliveryLng)) &&
    Number(load.pickupLat) !== 0 &&
    Number(load.pickupLng) !== 0 &&
    Number(load.deliveryLat) !== 0 &&
    Number(load.deliveryLng) !== 0;

  // Check snapshot for route blocking indicators
  const snapshotBlocked =
    snapshot?.isDecisionBlocked === true ||
    snapshot?.routeStatus === "missing_coords" ||
    snapshot?.routeStatus === "invalid" ||
    snapshot?.routeStatus === "fallback" ||
    snapshot?.distanceSource === "fallback_120" ||
    snapshot?.distanceConfidence === "low";

  // Check advice for route blocking indicators
  const adviceBlocked =
    advice?.recommendation === "BLOCKED" ||
    advice?.recommendation === "UNKNOWN" ||
    advice?.recommendation === "blocked" ||
    advice?.recommendation === "unknown" ||
    advice?.status === "blocked" ||
    Boolean(advice?.blockedReason);

  // Route is blocked if any indicator is true
  const routeBlocked = adviceBlocked || snapshotBlocked || !hasValidCoords;

  return {
    hasValidCoords,
    routeBlocked,
    routeStatus: routeBlocked ? "missing_or_unreliable" : "reliable",
  };
}

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

  const filteredLoads = useMemo(() => {
    console.log('[DispatchBoard] Computing filteredLoads with aiFilter:', aiFilter);
    return loads.filter((load: any) => {
      // Get snapshot for display values only
      const snapshot = load.financialSnapshot || safeSnapshot;

      // Check status filter
      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(String(load.status || ""));

      // Check search filter
      const matchesSearch =
        !filters.search ||
        String(load.id || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.clientName || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.merchandiseType || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.pickupAddress || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        String(load.deliveryAddress || "").toLowerCase().includes(filters.search.toLowerCase());

      // Check margin filter
      const margin = Number(snapshot.margin || 0);
      const matchesMargin = margin >= filters.marginRange[0] && margin <= filters.marginRange[1];

      // Get route quality
      const advice = adviceMap.get(load.id);
      const routeQuality = getRouteQuality(load, advice);

      // Check data quality filter
      const matchesDataQuality =
        filters.dataQuality === "all" ||
        (filters.dataQuality === "reliable" && !routeQuality.routeBlocked) ||
        (filters.dataQuality === "missing" && routeQuality.routeBlocked);

      // Apply AI recommendation filter
      if (aiFilter !== "all") {
        const rec = String(advice?.recommendation || "").toLowerCase();
        if (load.id === 600020) console.log('[DispatchBoard] Load 600020 - aiFilter:', aiFilter, 'rec:', rec, 'routeBlocked:', routeQuality.routeBlocked);

        if (aiFilter === "blocked") {
          // Show only route-blocked loads
          const result = matchesStatus && matchesSearch && matchesMargin && matchesDataQuality && routeQuality.routeBlocked;
          if (load.id === 600020) console.log('[DispatchBoard] Load 600020 blocked filter result:', result);
          return result;
        }

        if (aiFilter === "reject") {
          // Show only economic REJECT loads (not route-blocked)
          return matchesStatus && matchesSearch && matchesMargin && matchesDataQuality && !routeQuality.routeBlocked && rec === "reject";
        }

        if (aiFilter === "accept") {
          // Show only ACCEPT loads (not route-blocked)
          return matchesStatus && matchesSearch && matchesMargin && matchesDataQuality && !routeQuality.routeBlocked && rec === "accept";
        }

        if (aiFilter === "negotiate") {
          // Show only NEGOTIATE loads (not route-blocked)
          return matchesStatus && matchesSearch && matchesMargin && matchesDataQuality && !routeQuality.routeBlocked && rec === "negotiate";
        }
      }

      // All filter or no AI filter
      return matchesStatus && matchesSearch && matchesMargin && matchesDataQuality;
    });
  }, [loads, filters, adviceMap, aiFilter]);

  // Calculate KPIs
  const blockedCount = useMemo(() => {
    return loads.filter((load: any) => {
      const advice = adviceMap.get(load.id);
      const routeQuality = getRouteQuality(load, advice);
      return routeQuality.routeBlocked;
    }).length;
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

        {/* View Mode Toggle */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">View:</span>
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Table
          </Button>
        </div>

        {/* AI Recommendation Filter Buttons */}
        <div className="mb-4 flex gap-2 items-center flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">AI Advisor:</span>
          {(["all", "accept", "negotiate", "reject", "blocked"] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={aiFilter === filter ? "default" : "outline"}
              onClick={() => setAIFilter(filter)}
            >
              {filter === "blocked" ? "🚫 Blocked" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        <DispatchKPIStrip loads={filteredLoads} blockedCount={blockedCount} />

        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : viewMode === "kanban" ? (
            <DispatchKanbanBoard
              loads={filteredLoads}
              adviceMap={adviceMap}
              selectedLoadId={selectedLoadId}
              onSelectLoad={setSelectedLoadId}
              getRouteQuality={getRouteQuality}
            />
          ) : (
            <DispatchTableView
              loads={filteredLoads}
              adviceMap={adviceMap}
              selectedLoadId={selectedLoadId}
              onSelectLoad={setSelectedLoadId}
              getRouteQuality={getRouteQuality}
            />
          )}
        </div>
      </div>
    </div>
  );
}
