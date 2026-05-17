/**
 * DispatchLoadCard.tsx
 * Dispatcher-oriented load card showing key metrics and quick actions
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import {
  formatMargin,
  formatProfit,
  formatRate,
  getStatusColor,
  getFinancialStatusColor,
  calculateMarginColor,
} from "@/utils/dispatchHelpers";
import LoadAdviceBadge from "./LoadAdviceBadge";

interface DispatchLoadCardProps {
  load: any;
  advice?: any;
  onSelect: (loadId: number) => void;
  onAssign: (loadId: number, driverId?: number) => void;
  onReassign: (loadId: number) => void;
  compact?: boolean;
}

export default function DispatchLoadCard({
  load,
  advice,
  onSelect,
  onAssign,
  onReassign,
  compact = false,
}: DispatchLoadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  // 🚨 Check if this load uses unreliable fallback distance
  const isUsingFallback = snapshot.distanceSource === "fallback_120";
  const profitWarning = !snapshot.profitIsReliable;

  const marginColor = calculateMarginColor(snapshot.margin);
  const financialStatusColor = getFinancialStatusColor(snapshot.status);
  const statusColor = getStatusColor(load.status);

  if (compact) {
    // Show blocked/fallback warning in compact mode
    if (snapshot.isDecisionBlocked || isUsingFallback) {
      return (
        <Card
          className={`p-3 cursor-pointer hover:bg-accent transition-colors border-orange-500/50 border`}
          onClick={() => onSelect(load.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                ⚠️ Load #{load.id}
              </div>
              <div className="text-xs text-orange-400 truncate">Route Missing</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-orange-400">BLOCKED</div>
              <div className="text-xs text-muted-foreground">Needs backfill</div>
            </div>
          </div>
        </Card>
      );
    }

    // Normal compact card with advisor info
    return (
      <Card
        className={`p-3 cursor-pointer hover:bg-accent transition-colors`}
        onClick={() => onSelect(load.id)}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">Load #{load.id}</div>
              <div className="text-xs text-muted-foreground truncate">{load.clientName}</div>
            </div>
            {advice && (
              <div className="text-right">
                <div className={`text-xs font-bold ${
                  advice.recommendation === 'accept' ? 'text-green-400' :
                  advice.recommendation === 'negotiate' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {advice.recommendation.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">{advice.confidence}% conf</div>
              </div>
            )}
          </div>

          {/* Financial metrics */}
          <div className="grid grid-cols-3 gap-1 text-xs">
            <div>
              <span className="text-muted-foreground">Rate:</span>
              <div className="font-semibold">${(snapshot.ratePerMile || 0).toFixed(2)}/mi</div>
            </div>
            <div>
              <span className="text-muted-foreground">Margin:</span>
              <div className={`font-semibold ${
                marginColor === 'green' ? 'text-green-400' :
                marginColor === 'yellow' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {formatMargin(snapshot.margin)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Profit:</span>
              <div className={`font-semibold ${
                (snapshot.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatProfit(snapshot.profit)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isExpanded ? "ring-2 ring-primary" : "hover:bg-accent"
      } ${isUsingFallback ? "border-orange-500/50 border" : ""}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-lg">#{load.id}</span>
            <Badge className={statusColor}>{load.status}</Badge>
            {(snapshot.isDecisionBlocked || isUsingFallback || snapshot.distanceConfidence === "low") && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                📍 Needs Backfill
              </Badge>
            )}
            {advice && <LoadAdviceBadge advice={advice} />}
          </div>
          <div className="text-sm text-muted-foreground truncate">{load.clientName}</div>
        </div>
        <div className="text-right">
          <div
            className={`text-lg font-bold ${
              isUsingFallback
                ? "text-orange-400"
                : marginColor === "green"
                  ? "text-green-400"
                  : marginColor === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
            }`}
          >
            {formatMargin(snapshot.margin)}
          </div>
          <div className="text-xs text-muted-foreground">{formatProfit(snapshot.profit)}</div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 text-sm mb-3 text-muted-foreground">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <div className="truncate">
          {load.pickupAddress?.split(",")[0]} → {load.deliveryAddress?.split(",")[0]}
        </div>
      </div>

      {/* Fallback Distance Warning */}
      {isUsingFallback && (
        <div className="bg-orange-500/10 border border-orange-500/50 rounded p-2 mb-3 text-xs text-orange-600 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            Using fallback 120-mile estimate. Route coordinates missing. Financial metrics unreliable
            until geocoding is completed.
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-secondary/50 rounded p-2">
          <div className="text-muted-foreground">Rate</div>
          <span className="font-semibold">${Number(load.price || 0).toFixed(2)}</span>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <div className="text-muted-foreground">Weight</div>
          <div className="font-semibold">{load.weight} lbs</div>
        </div>
        <div
          className={`${
            isUsingFallback ? "bg-orange-500/20 border border-orange-500/50" : financialStatusColor
          } rounded p-2`}
        >
          <div className="text-muted-foreground">Status</div>
          <div className="font-semibold capitalize">{isUsingFallback ? "⚠️ Fallback" : snapshot.status}</div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merchandise:</span>
              <span>{load.merchandiseType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Price:</span>
              <span className="font-semibold">${Number(load.price || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance Source:</span>
              <span
                className={
                  snapshot.distanceConfidence === "low"
                    ? "text-orange-400 font-semibold"
                    : snapshot.distanceConfidence === "medium"
                      ? "text-yellow-400"
                      : ""
                }
              >
                {snapshot.distanceSource === "fallback_120"
                  ? "Fallback 120mi"
                  : snapshot.distanceSource === "calculated"
                    ? "Calculated"
                    : "Explicit"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit Reliable:</span>
              <span className={snapshot.profitIsReliable ? "text-green-400" : "text-orange-400"}>
                {snapshot.profitIsReliable ? "✓ Yes" : "✗ No (fallback)"}
              </span>
            </div>
            {load.assignedDriverId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver ID:</span>
                <span>{load.assignedDriverId}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(load.id);
              }}
            >
              Detail
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="default" className="flex-1">
                  Assign <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAssign(load.id)}>
                  Assign to Driver
                </DropdownMenuItem>
                {load.assignedDriverId && (
                  <DropdownMenuItem onClick={() => onReassign(load.id)}>
                    Reassign
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </Card>
  );
}
