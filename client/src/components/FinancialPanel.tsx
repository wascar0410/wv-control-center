/**
 * FinancialPanel.tsx
 * Direct financial calculation from load data with vehicle operating costs
 * Uses SAME data as AI Advisor for consistency
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toMoney, toFixedSafe } from "@/utils/number";
import { calculateOperatingCosts, getCostSummary, getCostBreakdown } from "@/utils/vehicle-costs";

interface FinancialPanelProps {
  load: any;
}

export function FinancialPanel({ load }: FinancialPanelProps) {
  // 💰 FINANCIAL VALUES - Direct from load data (same as AI Advisor)
  const revenue = Number(load?.price) || 0;
  const estimatedTolls = Number(load?.estimatedTolls) || 0;
  const miles = Number(load?.miles) || 120;
  const vehicleType = load?.vehicleType || "cargo_van";

  // 🚗 VEHICLE OPERATING COSTS - Professional calculation
  const operatingCosts = calculateOperatingCosts(miles, vehicleType);
  const costSummary = getCostSummary(miles, vehicleType);
  const costBreakdown = getCostBreakdown(miles, vehicleType);

  // Calculate REAL profit after all operating costs
  const totalExpenses = operatingCosts.total + estimatedTolls;
  const profit = revenue - totalExpenses;
  const profitPerMile = miles > 0 ? profit / miles : 0;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Determine status
  const isPositiveProfit = profit >= 0;
  const isHealthyMargin = marginPercent >= 15;

  // Validation
  const hasValidData = !isNaN(revenue) && !isNaN(totalExpenses) && !isNaN(profit);

  if (!hasValidData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-600">❌ Invalid financial data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>
              Real profit calculation with vehicle operating costs
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {isPositiveProfit ? (
              <Badge className="bg-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                Profitable
              </Badge>
            ) : (
              <Badge variant="destructive">
                <TrendingDown className="w-3 h-3 mr-1" />
                Loss
              </Badge>
            )}

            {isHealthyMargin && (
              <Badge variant="secondary">Healthy Margin</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Revenue */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Revenue</h4>
          <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Load Price
            </span>
            <span className="font-semibold text-lg text-green-600">
              ${toMoney(revenue)}
            </span>
          </div>
        </div>

        {/* Operating Costs */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">
            Operating Costs (${toMoney(operatingCosts.costPerMile)}/mi × {toDisplay(miles, 0)} mi)
          </h4>

          {costBreakdown.map((cost) => (
            <div key={cost.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{cost.label}</span>
              <span className="font-medium">${toMoney(cost.value)}</span>
            </div>
          ))}

          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
            <span>Operating Costs Total</span>
            <span className="text-orange-600">
              ${toMoney(operatingCosts.total)}
            </span>
          </div>

          {estimatedTolls > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tolls</span>
                <span className="font-medium">${toMoney(estimatedTolls)}</span>
              </div>
            </>
          )}

          <div className="border-t pt-2 flex justify-between text-sm font-bold">
            <span>Total Expenses</span>
            <span className="text-red-600">
              ${toMoney(totalExpenses)}
            </span>
          </div>
        </div>

        {/* Profit */}
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex justify-between">
            <span>Net Profit</span>
            <span
              className={`text-xl font-bold ${
                isPositiveProfit ? "text-green-600" : "text-red-600"
              }`}
            >
              ${toMoney(profit)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Profit Margin</span>
            <span
              className={`font-semibold ${
                isHealthyMargin ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {toFixedSafe(marginPercent, 2)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span>Profit Per Mile</span>
            <span className="font-semibold">
              ${toMoney(profitPerMile)}/mi
            </span>
          </div>
        </div>

        {/* Data Source Note */}
        <div className="text-xs text-muted-foreground p-3 bg-background/50 rounded">
          <p>📊 <strong>Data Source:</strong> Direct calculation from load fields + vehicle operating costs</p>
          <p>✅ <strong>Consistency:</strong> Uses same data as AI Load Advisor</p>
          <p>🚗 <strong>Vehicle:</strong> {vehicleType} at ${toMoney(operatingCosts.costPerMile)}/mile</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function
function toDisplay(value: number, decimals: number): string {
  return toFixedSafe(value, decimals);
}
