import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingDown, Lock, AlertTriangle } from "lucide-react";
import { MarginTrendIndicator } from "./MarginTrendIndicator";

interface KPIMetrics {
  avgMargin: number;
  loadsAtRisk: number;
  totalBlockedAmount: number;
  criticalAlerts: number;
}

export function OperationalKPIStrip() {
  const { data: loads } = trpc.loads.list.useQuery();
  const { data: alerts } = trpc.financialExtended.getFinancialAlerts.useQuery();

  const metrics = useMemo<KPIMetrics>(() => {
    let totalMargin = 0;
    let marginCount = 0;
    let riskCount = 0;
    let blockedAmount = 0;

    // Calculate average margin and risk loads
    // This is a simplified calculation - in production would use actual profit data
    if (loads && loads.length > 0) {
      loads.forEach((load: any) => {
        // Estimate margin from estimated income and estimated cost
        const income = Number(load.estimatedIncome) || 0;
        const cost = Number(load.estimatedCost) || 0;
        if (income > 0 && cost > 0) {
          const margin = ((income - cost) / income) * 100;
          totalMargin += margin;
          marginCount++;
          if (margin < 8) riskCount++;
        }
      });
    }

    // Extract blocked amount from alerts
    const paymentBlockAlert = alerts?.alerts?.find((a) => a.id === "payments_blocked");
    if (paymentBlockAlert) {
      const match = paymentBlockAlert.message.match(/\$(\d+(?:\.\d{2})?)/);
      if (match) {
        blockedAmount = parseFloat(match[1]);
      }
    }

    return {
      avgMargin: marginCount > 0 ? totalMargin / marginCount : 0,
      loadsAtRisk: riskCount,
      totalBlockedAmount: blockedAmount,
      criticalAlerts: alerts?.criticalCount || 0,
    };
  }, [loads, alerts]);

  const getMarginColor = (margin: number) => {
    if (margin > 15) return "text-green-600 dark:text-green-400";
    if (margin >= 8) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMarginBgColor = (margin: number) => {
    if (margin > 15) return "bg-green-50 dark:bg-green-950/30";
    if (margin >= 8) return "bg-yellow-50 dark:bg-yellow-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:gap-3">
      {/* Average Margin */}
      <Card className={getMarginBgColor(metrics.avgMargin)}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Margen Promedio</p>
              <p className={`text-lg md:text-xl font-bold ${getMarginColor(metrics.avgMargin)}`}>
                {metrics.avgMargin.toFixed(1)}%
              </p>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <MarginTrendIndicator currentMargin={metrics.avgMargin} />
              </div>
            </div>
            <TrendingDown className={`h-5 w-5 flex-shrink-0 ${getMarginColor(metrics.avgMargin)}`} />
          </div>
        </CardContent>
      </Card>

      {/* Loads at Risk */}
      <Card className={metrics.loadsAtRisk > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Cargas en Riesgo</p>
              <p className={`text-lg md:text-xl font-bold ${metrics.loadsAtRisk > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {metrics.loadsAtRisk}
              </p>
            </div>
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${metrics.loadsAtRisk > 0 ? "text-red-600" : "text-green-600"}`} />
          </div>
        </CardContent>
      </Card>

      {/* Total Blocked Amount */}
      <Card className={metrics.totalBlockedAmount > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Bloqueado</p>
              <p className={`text-lg md:text-xl font-bold ${metrics.totalBlockedAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                ${metrics.totalBlockedAmount.toFixed(0)}
              </p>
            </div>
            <Lock className={`h-5 w-5 flex-shrink-0 ${metrics.totalBlockedAmount > 0 ? "text-red-600" : "text-green-600"}`} />
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      <Card className={metrics.criticalAlerts > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Alertas Críticas</p>
              <p className={`text-lg md:text-xl font-bold ${metrics.criticalAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {metrics.criticalAlerts}
              </p>
            </div>
            <AlertCircle className={`h-5 w-5 flex-shrink-0 ${metrics.criticalAlerts > 0 ? "text-red-600" : "text-green-600"}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
