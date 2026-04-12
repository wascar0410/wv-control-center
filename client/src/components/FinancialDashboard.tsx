import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllocationSettings } from "./AllocationSettings";
import { FinancialAlerts } from "./FinancialAlerts";
import { PaymentBlocksPanel } from "./PaymentBlocksPanel";
import { ReconciliationPanel } from "./ReconciliationPanel";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const DEFAULT_ESTIMATED_TAX_RATE = 0.25;

export function FinancialDashboard() {
  const { data: dashboardData, isLoading } =
    trpc.financial.getDashboardSummary.useQuery({});

  const { data: alertsData } =
    trpc.financialExtended.getFinancialAlerts.useQuery();

  const { data: reconciliationData } =
    trpc.financialExtended.getReconciliationData.useQuery(undefined, {
      refetchInterval: 30000,
    });

  if (isLoading) {
    return <div className="p-4">Loading financial data...</div>;
  }

  const plSummary = dashboardData?.plSummary;
  const metrics = dashboardData?.metrics;
  const variance = dashboardData?.variance;
  const allocations = dashboardData?.allocations;
  const cashFlow = dashboardData?.cashFlow;

  const netProfit = Number(plSummary?.netProfit || 0);
  const taxableProfit = Math.max(netProfit, 0);
  const estimatedTaxReserve = taxableProfit * DEFAULT_ESTIMATED_TAX_RATE;
  const netAfterTaxReserve = netProfit - estimatedTaxReserve;
  const quarterlyTaxSetAside = estimatedTaxReserve / 4;

  const criticalAlerts = alertsData?.criticalCount || 0;
  const warningAlerts = alertsData?.warningCount || 0;
  const activeBlocks =
    alertsData?.alerts?.find((a) => a.id === "payments_blocked") ? 1 : 0;
  const reconciliationDiscrepancies = reconciliationData?.discrepancies || 0;

  const executiveTone =
    activeBlocks > 0 || criticalAlerts > 0 || reconciliationDiscrepancies > 0
      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
      : warningAlerts > 0
        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
        : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20";

  return (
    <div className="w-full space-y-6">
      <Card className={executiveTone}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            Executive Financial Snapshot
            <Badge variant="outline">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="rounded-lg border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Active Blocks</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{activeBlocks}</p>
            <p className="text-xs text-muted-foreground">
              Review payment blockers before release decisions.
            </p>
          </div>

          <div className="rounded-lg border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Reconciliation Issues</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">
              {reconciliationDiscrepancies}
            </p>
            <p className="text-xs text-muted-foreground">
              Missing, underpaid, overpaid, or mismatched rows.
            </p>
          </div>

          <div className="rounded-lg border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Critical Alerts</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{criticalAlerts}</p>
            <p className="text-xs text-muted-foreground">
              Financial conditions needing immediate review.
            </p>
          </div>

          <div className="rounded-lg border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Net Cash Position</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(cashFlow?.netCashPosition || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Current cash visibility after pending withdrawals.
            </p>
          </div>

          <div className="rounded-lg border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Estimated Tax Reserve</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {formatCurrency(estimatedTaxReserve)}
            </p>
            <p className="text-xs text-muted-foreground">
              Estimated at {(DEFAULT_ESTIMATED_TAX_RATE * 100).toFixed(0)}% of positive net profit.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(plSummary?.totalRevenue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(plSummary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(netProfit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Tax Reserve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(estimatedTaxReserve)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Margin %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {(plSummary?.marginPercent || 0).toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Overview Summary
                <Badge variant="outline">Hotfix Stable</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Profit per Load</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerLoad || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit per Mile</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerMile || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit per Driver</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerDriver || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Cash Position</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(cashFlow?.netCashPosition || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">After Tax Reserve</p>
                <p className="text-lg font-semibold text-amber-700">
                  {formatCurrency(netAfterTaxReserve)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoicing Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Cash In</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(cashFlow?.cashIn || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(cashFlow?.cashPending || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quote Variance</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(variance?.variance || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(cashFlow?.walletBalance || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(cashFlow?.pendingWithdrawals || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cashFlow?.netCashPosition || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>P&amp;L Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Revenue</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(plSummary?.totalRevenue || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fuel</span>
                <span>{formatCurrency(plSummary?.breakdown?.fuel || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tolls</span>
                <span>{formatCurrency(plSummary?.breakdown?.tolls || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance</span>
                <span>{formatCurrency(plSummary?.breakdown?.maintenance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance</span>
                <span>{formatCurrency(plSummary?.breakdown?.insurance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Driver Payouts</span>
                <span>{formatCurrency(plSummary?.breakdown?.driverPayouts || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Commissions</span>
                <span>{formatCurrency(plSummary?.breakdown?.commissions || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total Expenses</span>
                <span className="text-red-600">
                  {formatCurrency(plSummary?.totalExpenses || 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Net Profit</span>
                <span className="text-blue-600">
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Allocation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Net Profit</span>
                <span>{formatCurrency(allocations?.netProfit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Operating Expenses</span>
                <span className="text-red-600">
                  {formatCurrency(allocations?.operatingExpenses || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Van Fund</span>
                <span className="text-blue-600">
                  {formatCurrency(allocations?.vanFund || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Emergency Reserve</span>
                <span className="text-yellow-600">
                  {formatCurrency(allocations?.emergencyReserve || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Wascar Draw</span>
                <span className="text-green-600">
                  {formatCurrency(allocations?.wascarDraw || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Yisvel Draw</span>
                <span className="text-emerald-600">
                  {formatCurrency(allocations?.yisvelDraw || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Tracking</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Taxable Profit Base</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(taxableProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Tax Rate</p>
                <p className="text-2xl font-bold text-amber-600">
                  {(DEFAULT_ESTIMATED_TAX_RATE * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Tax Reserve</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(estimatedTaxReserve)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quarterly Set-Aside</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(quarterlyTaxSetAside)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Control Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This tax view is currently an operational estimate based on positive net
                profit. It helps you reserve cash for taxes without mixing it into personal
                draws.
              </p>
              <p>
                Recommended workflow: all income enters the business, taxes are reserved
                first, then the remaining profit is reviewed for allocations and personal draws.
              </p>
              <p>
                Next step later: connect this panel to real tax categories, deductible
                expenses, quarterly estimates, and tax-compliance reports.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Cash Reconciliation
                <Badge variant="outline">Expected vs Actual</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">What this shows</p>
                <p className="mt-1 text-sm font-medium">
                  Compares invoice expectations against actual wallet-linked cash activity.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">What to review first</p>
                <p className="mt-1 text-sm font-medium">
                  Missing payments, then mismatches, then clean OK rows.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Operational use</p>
                <p className="mt-1 text-sm font-medium">
                  Use this before settlements, withdrawals, or payment release decisions.
                </p>
              </div>
            </CardContent>
          </Card>

          <ReconciliationPanel />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Financial Control Center
                <Badge variant="outline">Alerts + Blocks</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Focus</p>
                <p className="mt-1 text-sm font-medium">
                  Review active alerts and payment blockers before releasing cash.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Recommended Order</p>
                <p className="mt-1 text-sm font-medium">
                  1) Blocks, 2) Alerts, 3) Reconciliation
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Refresh</p>
                <p className="mt-1 text-sm font-medium">
                  Data updates automatically across financial control views.
                </p>
              </div>
            </CardContent>
          </Card>

          <PaymentBlocksPanel />
          <FinancialAlerts />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AllocationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
