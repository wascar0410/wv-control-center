import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfitPerLoadCardProps {
  loadId: number;
}

export function ProfitPerLoadCard({ loadId }: ProfitPerLoadCardProps) {
  // Fetch profit data for this load
  const { data: profitData, isLoading, error } = trpc.financialExtended.getProfitPerLoad.useQuery({
    loadId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Calculating profit...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !profitData) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>Failed to load profit data for this load.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const {
    revenue,
    expenses,
    totalExpenses,
    actualProfit,
    actualMargin,
    profitPerMile,
    estimatedProfit,
    variance,
    variancePercent,
  } = profitData;

  const isPositiveVariance = variance >= 0;
  const isPositiveProfit = actualProfit >= 0;
  const isHealthyMargin = actualMargin >= 15;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Load Profitability</CardTitle>
            <CardDescription>Real profit calculation for this load</CardDescription>
          </div>
          <div className="flex gap-2">
            {isPositiveProfit ? (
              <Badge variant="default" className="bg-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                Profitable
              </Badge>
            ) : (
              <Badge variant="destructive">
                <TrendingDown className="w-3 h-3 mr-1" />
                Loss
              </Badge>
            )}
            {isHealthyMargin && <Badge variant="secondary">Healthy Margin</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Revenue Section */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Revenue</h4>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Revenue</span>
            <span className="font-semibold text-lg text-green-600">${revenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Expenses Breakdown</h4>
          <div className="space-y-2">
            {expenses.fuel > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fuel</span>
                <span className="font-medium">${expenses.fuel.toFixed(2)}</span>
              </div>
            )}
            {expenses.tolls > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tolls</span>
                <span className="font-medium">${expenses.tolls.toFixed(2)}</span>
              </div>
            )}
            {expenses.maintenance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Maintenance</span>
                <span className="font-medium">${expenses.maintenance.toFixed(2)}</span>
              </div>
            )}
            {expenses.driverPay > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Driver Pay</span>
                <span className="font-medium">${expenses.driverPay.toFixed(2)}</span>
              </div>
            )}
            {expenses.commissions > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Commissions</span>
                <span className="font-medium">${expenses.commissions.toFixed(2)}</span>
              </div>
            )}
            {expenses.other > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Other</span>
                <span className="font-medium">${expenses.other.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
              <span>Total Expenses</span>
              <span className="text-red-600">${totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Profit Summary */}
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Actual Profit</span>
            <span className={`text-xl font-bold ${isPositiveProfit ? "text-green-600" : "text-red-600"}`}>
              ${actualProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Profit Margin</span>
            <span className={`text-lg font-semibold ${isHealthyMargin ? "text-green-600" : "text-yellow-600"}`}>
              {actualMargin.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Profit Per Mile</span>
            <span className="font-semibold">${profitPerMile.toFixed(2)}/mi</span>
          </div>
        </div>

        {/* Variance Analysis */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm">Quote Analysis Comparison</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated Profit</span>
              <span className="font-medium">${estimatedProfit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Actual Profit</span>
              <span className="font-medium">${actualProfit.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between font-semibold">
              <span>Variance</span>
              <span className={isPositiveVariance ? "text-green-600" : "text-red-600"}>
                {isPositiveVariance ? "+" : ""}${variance.toFixed(2)} ({variancePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          {Math.abs(variancePercent) > 20 && (
            <Alert className="mt-2 border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800 text-xs">
                Variance exceeds 20%. Review quote accuracy and cost estimates.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
