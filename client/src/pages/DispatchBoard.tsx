/**
 * DispatchBoard.tsx
 * Main dispatch board page - professional operational hub
 * Delgada: 250-400 líneas, lógica en hooks/helpers/componentes
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useDispatchFilters } from "@/hooks/useDispatchFilters";
import { filterLoads } from "@/utils/dispatchHelpers";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import DispatchFilterPanel from "@/components/dispatch/DispatchFilterPanel";
import DispatchKPIStrip from "@/components/dispatch/DispatchKPIStrip";
import DispatchKanbanBoard from "@/components/dispatch/DispatchKanbanBoard";
import DispatchTableView from "@/components/dispatch/DispatchTableView";
import DispatchDetailDrawer from "@/components/dispatch/DispatchDetailDrawer";
import { toast } from "sonner";

export default function DispatchBoard() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const { filters, setFilters, applyQuickView } = useDispatchFilters();

  const query = trpc.loads.list.useQuery(
    { status: filters.status.length > 0 ? filters.status[0] : undefined },
    { refetchInterval: 30000 }
  );

  const rawData = query.data;

  const loads = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray((rawData as any).loads)) return (rawData as any).loads;
    if (rawData && Array.isArray((rawData as any).items)) return (rawData as any).items;

    console.error("[DispatchBoard] Unexpected loads.list response shape:", rawData);
    return [];
  }, [rawData]);

  const assignMutation = trpc.assignment.assign.useMutation({
    onSuccess: () => {
      toast.success("Load assigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign load");
    },
  });

  const filteredLoads = useMemo(() => {
    try {
      return filterLoads(loads, filters);
    } catch (err) {
      console.error("[DispatchBoard] filterLoads failed:", err, { loads, filters });
      return [];
    }
  }, [loads, filters]);

  const selectedLoad = useMemo(() => {
    return loads.find((l: any) => l.id === selectedLoadId) || null;
  }, [loads, selectedLoadId]);

  const handleAssign = (loadId: number, driverId?: number) => {
    if (!driverId) {
      toast.info("Driver selection modal coming soon");
      return;
    }
    assignMutation.mutate({ loadId, driverId });
  };

  const handleReassign = (loadId: number) => {
    toast.info("Reassign modal coming soon");
  };

  const handleLoadSelect = (loadId: number) => {
    setSelectedLoadId(loadId);
    setShowDetailDrawer(true);
  };

  if (query.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading loads</h2>
          <p className="text-muted-foreground">{query.error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dispatch Board</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
        </div>
      </div>

      <DispatchKPIStrip loads={filteredLoads} />

      <div className="flex gap-4 flex-1 min-h-0">
        <DispatchFilterPanel
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onApplyQuickView={applyQuickView}
        />

        <div className="flex-1 min-w-0">
          {query.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "kanban" ? (
            <DispatchKanbanBoard
              loads={filteredLoads}
              onLoadSelect={handleLoadSelect}
              onAssign={handleAssign}
              onReassign={handleReassign}
            />
          ) : (
            <DispatchTableView
              loads={filteredLoads}
              onLoadSelect={handleLoadSelect}
              onAssign={handleAssign}
              onReassign={handleReassign}
            />
          )}
        </div>
      </div>

      <DispatchDetailDrawer
        load={selectedLoad}
        isOpen={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
        onAssign={handleAssign}
        onReassign={handleReassign}
      />
    </div>
  );
}
