/**
 * DispatchKanbanBoard.tsx
 * Kanban view with columns by load status
 */

import { groupLoadsByStatus } from "@/utils/dispatchHelpers";
import DispatchLoadCard from "./DispatchLoadCard";

interface DispatchKanbanBoardProps {
  loads: any[];
  onLoadSelect: (loadId: number) => void;
  onAssign: (loadId: number, driverId?: number) => void;
  onReassign: (loadId: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-blue-500/10 border-blue-500/30" },
  quoted: { label: "Quoted", color: "bg-purple-500/10 border-purple-500/30" },
  assigned: { label: "Assigned", color: "bg-amber-500/10 border-amber-500/30" },
  in_transit: { label: "In Transit", color: "bg-orange-500/10 border-orange-500/30" },
  delivered: { label: "Delivered", color: "bg-green-500/10 border-green-500/30" },
  invoiced: { label: "Invoiced", color: "bg-cyan-500/10 border-cyan-500/30" },
  paid: { label: "Paid", color: "bg-emerald-500/10 border-emerald-500/30" },
};

export default function DispatchKanbanBoard({
  loads,
  onLoadSelect,
  onAssign,
  onReassign,
}: DispatchKanbanBoardProps) {
  const grouped = groupLoadsByStatus(loads);
  const statusOrder = ["available", "quoted", "assigned", "in_transit", "delivered", "invoiced", "paid"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {statusOrder.map((status) => {
        const statusLoads = grouped[status] || [];
        const config = STATUS_CONFIG[status] || { label: status, color: "bg-gray-500/10" };

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-80 border rounded-lg p-4 ${config.color}`}
          >
            {/* Column Header */}
            <div className="mb-4 pb-3 border-b">
              <h3 className="font-semibold text-sm">{config.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{statusLoads.length} loads</p>
            </div>

            {/* Cards */}
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {statusLoads.length > 0 ? (
                statusLoads.map((load) => (
                  <DispatchLoadCard
                    key={load.id}
                    load={load}
                    onSelect={onLoadSelect}
                    onAssign={onAssign}
                    onReassign={onReassign}
                    compact={false}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No loads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
