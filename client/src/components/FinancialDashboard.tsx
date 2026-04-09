import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllocationSettings } from "./AllocationSettings";
import { FinancialAlerts } from "./FinancialAlerts";
import { PaymentBlocksPanel } from "./PaymentBlocksPanel";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * Financial Dashboard Component
 *
 * Displays comprehensive financial data:
 * - Overview: P&L summary, key metrics
 * - Invoicing: Revenue tracking, aging report
 * - Wallet: Balance, transactions, withdrawals
 * - P&L: Detailed profit/loss breakdown
 * - Allocation: Owner draw, reserves, reinvestment
 */

export function FinancialDashboard() {
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});

  // Fetch financial data
  const { data: dashboardData, isLoading: dashboardLoading } =
    trpc.financial.getDashboardSummary.useQuery(dateRange);

  const { data: plSummary } = trpc.financial.getPLSummary.useQuery(dateRange);
  const { data: metrics } = trpc.financial.getProfitMetrics.useQuery(dateRange);
  const { data: variance } = trpc.financial.getQuoteVariance.useQuery(dateRange);
  const { data: allocations } = trpc.financial.calculateAllocations.useQuery(
    dateRange
  );
  const { data: cashFlow } = trpc.financial.getCashFlow.useQuery(dateRange);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // P&L breakdown chart data
  const plChartData = useMemo(
    () => [
      {
        name: "Revenue",
        value: plSummary?.totalRevenue || 0,
        fill: "#10b981",
      },
      {
        name: "Expenses",
        value: plSummary?.totalExpenses || 0,
        fill: "#ef4444",
      },
      {
        name: "Net Profit",
        value: plSummary?.netProfit || 0,
        fill: "#3b82f6",
      },
    ],
    [plSummary]
  );

  // Expense breakdown
  const expenseChartData = useMemo(
    () => [
      { name: "Fuel", value: plSummary?.breakdown.fuel || 0 },
      { name: "Tolls", value: plSummary?.breakdown.tolls || 0 },
      { name: "Maintenance", value: plSummary?.breakdown.maintenance || 0 },
      { name: "Insurance", value: plSummary?.breakdown.insurance || 0 },
      { name: "Driver Payouts", value: plSummary?.breakdown.driverPayouts || 0 },
      { name: "Commissions", value: plSummary?.breakdown.commissions || 0 },
    ],
    [plSummary]
  );

  // Allocation breakdown
  const allocationChartData = useMemo(
    () => [
      { name: "Owner Draw", value: allocations?.ownerDraw || 0 },
      { name: "Reserve Fund", value: allocations?.reserveFund || 0 },
      { name: "Reinvestment", value: allocations?.reinvestment || 0 },
      { name: "Operating Cash", value: allocations?.operatingCash || 0 },
    ],
    [allocations]
  );

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

  if (dashboardLoading) {
    return <div className="p-4">Loading financial data...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(plSummary?.totalRevenue || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(plSummary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(plSummary?.netProfit || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Margin % */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
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

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Profit per Load</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerLoad || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Profit per Mile</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerMile || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Profit per Driver</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(metrics?.profitPerDriver || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quote Variance</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(variance?.variance || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* P&L Summary Chart */}
          <Card>
            <CardHeader>
              <CardTitle>P&L Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={plChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="value" fill="#8884d8">
                    {plChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoicing Tab */}
        <TabsContent value="invoicing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoicing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(plSummary?.totalRevenue || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cash Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(cashFlow?.cashPending || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cash In (Paid)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(cashFlow?.cashIn || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit by Broker */}
          <Card>
            <CardHeader>
              <CardTitle>Profit by Broker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics?.profitByBroker?.map((broker, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm">{broker.broker}</span>
                    <div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(broker.profit)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (Revenue: {formatCurrency(broker.revenue)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Wallet Balance
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Net Cash Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cashFlow?.netCashPosition || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Cash In (Paid Invoices)</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(cashFlow?.cashIn || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Pending (Unpaid)</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(cashFlow?.cashPending || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span>Wallet Balance</span>
                  <span className="font-semibold">
                    {formatCurrency(cashFlow?.walletBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Less: Pending Withdrawals</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(cashFlow?.pendingWithdrawals || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-bold">
                  <span>Net Cash Position</span>
                  <span className="text-blue-600">
                    {formatCurrency(cashFlow?.netCashPosition || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl" className="space-y-4">
          {/* Expense Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed P&L */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed P&L Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Revenue</span>
                <span className="text-green-600">
                  {formatCurrency(plSummary?.totalRevenue || 0)}
                </span>
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Expenses:</p>
                <div className="space-y-1 ml-4">
                  <div className="flex justify-between">
                    <span>Fuel</span>
                    <span>{formatCurrency(plSummary?.breakdown.fuel || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tolls</span>
                    <span>{formatCurrency(plSummary?.breakdown.tolls || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance</span>
                    <span>{formatCurrency(plSummary?.breakdown.maintenance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance</span>
                    <span>{formatCurrency(plSummary?.breakdown.insurance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver Payouts</span>
                    <span>{formatCurrency(plSummary?.breakdown.driverPayouts || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commissions</span>
                    <span>{formatCurrency(plSummary?.breakdown.commissions || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total Expenses</span>
                <span className="text-red-600">
                  {formatCurrency(plSummary?.totalExpenses || 0)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Net Profit</span>
                <span className="text-blue-600">
                  {formatCurrency(plSummary?.netProfit || 0)}
                </span>
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span>Margin %</span>
                <span className="text-purple-600">
                  {(plSummary?.marginPercent || 0).toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quote Variance */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Analysis Variance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Estimated Total Profit</span>
                <span className="font-semibold">
                  {formatCurrency(variance?.totalEstimatedProfit || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Actual Total Profit</span>
                <span className="font-semibold">
                  {formatCurrency(variance?.totalActualProfit || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Variance</span>
                <span
                  className={
                    (variance?.variance || 0) >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatCurrency(variance?.variance || 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Variance %</span>
                <span
                  className={
                    (variance?.variancePercent || 0) >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {(variance?.variancePercent || 0).toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocation Tab */}
        <TabsContent value="allocation" className="space-y-4">
          {/* Allocation Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Allocation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Allocation Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Net Profit</span>
                <span className="text-blue-600">
                  {formatCurrency(allocations?.netProfit || 0)}
                </span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Owner Draw (40%)</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(allocations?.ownerDraw || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reserve Fund (20%)</span>
                  <span className="font-semibold text-yellow-600">
                    {formatCurrency(allocations?.reserveFund || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reinvestment (20%)</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(allocations?.reinvestment || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Cash (20%)</span>
                  <span className="font-semibold text-purple-600">
                    {formatCurrency(allocations?.operatingCash || 0)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 text-sm text-gray-600">
                <p>
                  These allocations are calculated based on your configured percentages.
                  Adjust allocation settings in Business Configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <PaymentBlocksPanel />
          <FinancialAlerts />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <AllocationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
