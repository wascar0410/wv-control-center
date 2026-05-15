import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toMoney, toFixedSafe } from "@/utils/number";

// 🔥 FINANCIAL VALUES - use toMoney to expose backend errors
// 📊 UI METRICS - use toFixedSafe for safe formatting

interface ProfitPerLoadCardProps {
  loadId: number;
}

// 🔥 HELPERS - using structured number system
const money = (v: any) => `$${toMoney(v)}`;
const percent = (v: any) => `${toFixedSafe(v, 2)}%`;

export function ProfitPerLoadCard({ loadId }: ProfitPerLoadCardProps) {
  const { data: profitData, isLoading, error } =
    trpc.financialExtended.getProfitPerLoad.useQuery({
      loadId,
    });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">
            Calculating profit...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error || !profitData) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load profit data for this load.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 💰 KEEP RAW NUMBERS for logic, format only for display
  const rawRevenue = profitData.revenue ?? 0;
  const rawTotalExpenses = profitData.totalExpenses ?? 0;
  const rawActualProfit = profitData.actualProfit ?? 0;
  const rawEstimatedProfit = profitData.estimatedProfit ?? 0;
  const rawProfitPerMile = profitData.profitPerMile ?? 0;
  const rawActualMargin = profitData.actualMargin ?? 0;
  const rawVariance = profitData.variance ?? 0;
  const rawVariancePercent = profitData.variancePercent ?? 0;

  // 💰 FORMAT FOR DISPLAY
  const revenue = toMoney(rawRevenue);
  const expenses = {
    fuel: toMoney(profitData.expenses?.fuel ?? 0),
    tolls: toMoney(profitData.expenses?.tolls ?? 0),
    maintenance: toMoney(profitData.expenses?.maintenance ?? 0),
    driverPay: toMoney(profitData.expenses?.driverPay ?? 0),
    commissions: toMoney(profitData.expenses?.commissions ?? 0),
    other: toMoney(profitData.expenses?.other ?? 0),
  };

  const totalExpenses = toMoney(rawTotalExpenses);
  const actualProfit = toMoney(rawActualProfit);
  const estimatedProfit = toMoney(rawEstimatedProfit);
  const profitPerMile = toMoney(rawProfitPerMile);

  // 📊 UI METRICS - use raw numbers for logic
  const actualMargin = toFixedSafe(rawActualMargin, 2);
  const variance = toFixedSafe(rawVariance, 2);
  const variancePercent = toFixedSafe(rawVariancePercent, 2);

  const isPositiveVariance = rawVariance >= 0;
  const isPositiveProfit = rawActualProfit >= 0;
  const isHealthyMargin = rawActualMargin >= 15;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Load Profitability</CardTitle>
            <CardDescription>
              Real profit calculation for this load
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
          <div className="flex justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Total Revenue
            </span>
            <span className="font-semibold text-lg text-green-600">
              {money(revenue)}
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Expenses Breakdown</h4>

          {Object.entries(expenses).map(([key, value]) =>
            value > 0 ? (
              <div
                key={key}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground capitalize">
                  {key}
                </span>
                <span className="font-medium">{money(value)}</span>
              </div>
            ) : null
          )}

          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
            <span>Total Expenses</span>
            <span className="text-red-600">
              {money(totalExpenses)}
            </span>
          </div>
        </div>

        {/* Profit */}
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between">
            <span>Actual Profit</span>
            <span
              className={`text-xl font-bold ${
                isPositiveProfit ? "text-green-600" : "text-red-600"
              }`}
            >
              {money(actualProfit)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Profit Margin</span>
            <span
              className={`font-semibold ${
                isHealthyMargin ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {percent(actualMargin)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Profit Per Mile</span>
            <span className="font-semibold">
              {money(profitPerMile)}/mi
            </span>
          </div>
        </div>

        {/* Variance */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm">
            Quote Analysis Comparison
          </h4>

          <div className="flex justify-between text-sm">
            <span>Estimated Profit</span>
            <span>{money(estimatedProfit)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Actual Profit</span>
            <span>{money(actualProfit)}</span>
          </div>

          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Variance</span>
            <span
              className={
                isPositiveVariance ? "text-green-600" : "text-red-600"
              }
            >
              {isPositiveVariance ? "+" : ""}
              {money(variance)} ({percent(variancePercent)})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
