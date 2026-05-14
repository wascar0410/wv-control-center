/**
 * DispatchTableView.tsx
 * Table view for dispatch loads with sorting and pagination
 */

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import LoadAdviceBadge from "./LoadAdviceBadge";
import { useLoadAdvice } from "@/hooks/useLoadAdvice";
import {
  formatMargin,
  formatProfit,
  formatRate,
  getStatusColor,
  sortLoads,
} from "@/utils/dispatchHelpers";

interface DispatchTableViewProps {
  loads: any[];
  onLoadSelect: (loadId: number) => void;
  onAssign: (loadId: number, driverId?: number) => void;
  onReassign: (loadId: number) => void;
  adviceMap?: Map<number, any>;
  isLoadingAdvice?: boolean;
}

const ROWS_PER_PAGE = 50;

export default function DispatchTableView({
  loads,
  onLoadSelect,
  onAssign,
  onReassign,
  adviceMap = new Map(),
  isLoadingAdvice = false,
}: DispatchTableViewProps) {
  const [sortBy, setSortBy] = useState<"id" | "margin" | "profit" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => sortLoads(loads, sortBy, sortOrder), [loads, sortBy, sortOrder]);

  const paginatedLoads = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return sorted.slice(start, end);
  }, [sorted, page]);

  const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);

  const handleSort = (column: "id" | "margin" | "profit" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(0);
  };

  const getSortIndicator = (column: string) => {
    if (sortBy !== column) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => handleSort("id")}
              >
                ID{getSortIndicator("id")}
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-secondary/80 text-right"
                onClick={() => handleSort("margin")}
              >
                Margin%{getSortIndicator("margin")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-secondary/80 text-right"
                onClick={() => handleSort("profit")}
              >
                Profit{getSortIndicator("profit")}
              </TableHead>
              <TableHead className="text-right">Rate/mi</TableHead>
              <TableHead>AI Advisor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLoads.length > 0 ? (
              paginatedLoads.map((load) => {
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

                const isUsingFallback = snapshot.distanceSource === "fallback_120";
                const statusColor = getStatusColor(load.status);

                return (
                  <TableRow
                    key={load.id}
                    className={`cursor-pointer hover:bg-accent ${
                      isUsingFallback ? "bg-orange-500/5 border-l-2 border-orange-500" : ""
                    }`}
                    onClick={() => onLoadSelect(load.id)}
                  >
                    <TableCell className="font-semibold">
                      {isUsingFallback && <AlertTriangle className="w-3 h-3 inline mr-1 text-orange-500" />}
                      #{load.id}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{load.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {load.pickupAddress?.split(",")[0]} → {load.deliveryAddress?.split(",")[0]}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor}>{load.status}</Badge>
                      {isUsingFallback && (
                        <Badge className="ml-1 bg-orange-500/20 text-orange-400 border-orange-500/50">
                          ⚠️ Fallback
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{load.assignedDriverId || "-"}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        isUsingFallback ? "text-orange-400" : ""
                      }`}
                    >
                      {formatMargin(snapshot.margin)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        isUsingFallback ? "text-orange-400" : ""
                      }`}
                    >
                      {formatProfit(snapshot.profit)}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm ${
                        isUsingFallback ? "text-orange-400" : ""
                      }`}
                    >
                      {formatRate(snapshot.ratePerMile)}
                    </TableCell>
                    <TableCell>
                      <LoadAdviceBadge
                        advice={adviceMap.get(load.id)}
                        isLoading={isLoadingAdvice}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign(load.id);
                        }}
                      >
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No loads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} ({sorted.length} total)
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
