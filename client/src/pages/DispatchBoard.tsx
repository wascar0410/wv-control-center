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

  // Hooks
  const { filters, setFilters, applyQuickView } = useDispatchFilters();
  const { data: loads = [], isLoading, error } = trpc.loads.list.useQuery(
    { status: filters.status.length > 0 ? filters.status[0] : undefined },
    { refetchInterval: 30000 }
  );

  // Mutations
  const assignMutation = trpc.assignment.assign.useMutation({
    onSuccess: () => {
      toast.success("Load assigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign load");
    },
  });

  const reassignMutation = trpc.assignment.reassign.useMutation({
    onSuccess: () => {
      toast.success("Load reassigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reassign load");
    },
  });

  // Computed
  const filteredLoads = useMemo(() => filterLoads(loads, filters), [loads, filters]);
  const selectedLoad = loads.find((l) => l.id === selectedLoadId) || null;

  // Handlers
  const handleAssign = (loadId: number, driverId?: number) => {
    if (!driverId) {
      // TODO: Open driver selection modal
      toast.info("Driver selection modal coming soon");
      return;
    }
    assignMutation.mutate({ loadId, driverId });
  };

  const handleReassign = (loadId: number) => {
    // TODO: Open reassign modal
    toast.info("Reassign modal coming soon");
  };

  const handleLoadSelect = (loadId: number) => {
    setSelectedLoadId(loadId);
    setShowDetailDrawer(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading loads</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
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

      {/* KPI Strip */}
      <DispatchKPIStrip loads={filteredLoads} />

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Filter Panel */}
        <DispatchFilterPanel
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onApplyQuickView={applyQuickView}
        />

        {/* Board */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
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

      {/* Detail Drawer */}
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
