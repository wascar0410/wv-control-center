/**
 * DispatchKPIStrip.tsx
 * Top KPI metrics bar
 */

import { Card } from "@/components/ui/card";
import { calculateKPIs, formatMargin } from "@/utils/dispatchHelpers";


interface DispatchKPIStripProps {
  loads: any[];
}

export default function DispatchKPIStrip({ loads }: DispatchKPIStripProps) {
  const kpis = calculateKPIs(loads);

  return (
    <div className="grid grid-cols-6 gap-3 mb-4">
      {/* Total Loads */}
      <Card className="p-3 bg-secondary/50">
        <div className="text-xs text-muted-foreground">Total Loads</div>
        <div className="text-2xl font-bold">{kpis.totalLoads}</div>
      </Card>

      {/* Avg Margin */}
      <Card className="p-3 bg-secondary/50">
        <div className="text-xs text-muted-foreground">Avg Margin</div>
        <div className="text-2xl font-bold text-blue-400">{formatMargin(kpis.avgMargin)}</div>
      </Card>

      {/* At Risk */}
      <Card className="p-3 bg-yellow-500/10 border-yellow-500/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          At Risk
        </div>
        <div className="text-2xl font-bold text-yellow-400">{kpis.atRisk}</div>
      </Card>

      {/* Blocked */}
      <Card className="p-3 bg-red-500/10 border-red-500/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          Blocked
        </div>
        <div className="text-2xl font-bold text-red-400">{kpis.blocked}</div>
      </Card>

      {/* Pending */}
      <Card className="p-3 bg-amber-500/10 border-amber-500/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Pending
        </div>
        <div className="text-2xl font-bold text-amber-400">{kpis.pending}</div>
      </Card>

      {/* Critical Alerts */}
      <Card className="p-3 bg-red-500/10 border-red-500/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          Alerts
        </div>
        <div className="text-2xl font-bold text-red-400">{kpis.alerts}</div>
      </Card>
    </div>
  );
}
