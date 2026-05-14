import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useDispatchFilters } from "@/hooks/useDispatchFilters";
import { useLoadAdvice } from "@/hooks/useLoadAdvice";
import DispatchFilterPanel from "@/components/dispatch/DispatchFilterPanel";
import DispatchKPIStrip from "@/components/dispatch/DispatchKPIStrip";
import DispatchKanbanBoard from "@/components/dispatch/DispatchKanbanBoard";
import DispatchTableView from "@/components/dispatch/DispatchTableView";

type ViewMode = "kanban" | "table";
type AIRecommendationFilter = "all" | "accept" | "negotiate" | "reject";

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

      // Apply AI recommendation filter
      if (aiFilter !== "all") {
        const advice = adviceMap.get(load.id);
        if (!advice || advice.recommendation !== aiFilter) {
          return false;
        }
      }

      return matchesStatus && matchesSearch && matchesMargin;
    });
  }, [loads, filters, adviceMap, aiFilter]);

  // Log filtered results
  console.log("[DispatchBoard] filteredLoads.length:", filteredLoads.length);
  console.log("[DispatchBoard] filters.status:", filters.status);
  console.log("[DispatchBoard] filters.marginRange:", filters.marginRange);

  const handleLoadSelect = (loadId: number) => {
    setSelectedLoadId(loadId);
    window.location.href = `/loads/${loadId}`;
  };

  const handleAssign = (loadId: number) => {
    console.log("[DispatchBoard] Assign load:", loadId);
    window.location.href = `/loads/${loadId}`;
  };

  const handleReassign = (loadId: number) => {
    console.log("[DispatchBoard] Reassign load:", loadId);
    window.location.href = `/loads/${loadId}`;
  };

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold">Dispatch Board</h1>
        <div className="rounded border border-red-500 p-4">
          <p className="font-semibold">Error loading loads</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{query.error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <DispatchFilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onApplyQuickView={applyQuickView}
      />

      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dispatch Board</h1>
            <p className="text-sm text-muted-foreground">
              Centro operacional para monitorear cargas, márgenes y estado de dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="mr-2 h-4 w-4" />
              Table
            </Button>
          </div>
        </div>

        {/* AI Recommendation Filter Buttons */}
        <div className="mb-4 flex gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">AI Advisor:</span>
          {(["all", "accept", "negotiate", "reject"] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={aiFilter === filter ? "default" : "outline"}
              onClick={() => setAIFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        <DispatchKPIStrip loads={filteredLoads} />

        <div className="min-h-0 flex-1 overflow-hidden">
          {viewMode === "kanban" ? (
            <DispatchKanbanBoard
              loads={filteredLoads}
              adviceMap={adviceMap}
              onLoadSelect={handleLoadSelect}
              onAssign={handleAssign}
              onReassign={handleReassign}
            />
          ) : (
            <DispatchTableView
              loads={filteredLoads}
              adviceMap={adviceMap}
              onLoadSelect={handleLoadSelect}
              onAssign={handleAssign}
              onReassign={handleReassign}
              isLoadingAdvice={isLoadingAdvice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
