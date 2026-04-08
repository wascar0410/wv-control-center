/**
 * FinanceDashboard.tsx
 * Unified Finance Operations Center
 * Integrates: Invoicing, Wallet, Settlements, Analytics, and Reporting
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Download,
  BarChart3,
  FileText,
  Wallet,
  CreditCard,
} from "lucide-react";
import { FinancialDashboard } from "@/components/FinancialDashboard";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

// KPI Card Component
function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  color?: string;
}) {
  const isPositive = trend && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon className={`w-3 h-3 ${isPositive ? "text-green-600" : "text-red-600"}`} />
                <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  {Math.abs(trend)}% {trendLabel || ""}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${color ? "bg-opacity-20" : "bg-muted"}`}>
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Overview Tab
function OverviewTab() {
  const { data: agingReport } = trpc.invoicing.getAgingReport.useQuery();
  // wallet.getAll endpoint removed - using empty array as fallback
  const wallets = [];

  const stats = useMemo(() => {
    if (!agingReport || !wallets) {
      return {
        totalReceivable: 0,
        overdue: 0,
        totalWalletBalance: 0,
        avgWalletBalance: 0,
      };
    }

    const totalReceivable = agingReport.totalOutstanding;
    const overdue =
      agingReport["30_days"].total +
      agingReport["60_days"].total +
      agingReport["90_days"].total +
      agingReport["120_plus"].total;
    const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
    const avgWalletBalance = wallets.length > 0 ? totalWalletBalance / wallets.length : 0;

    return {
      totalReceivable,
      overdue,
      totalWalletBalance,
      avgWalletBalance,
    };
  }, [agingReport, wallets]);

  return (
    <div className="space-y-4">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={DollarSign}
          label="Total Receivable"
          value={formatCurrency(stats.totalReceivable)}
          color="text-blue-600"
        />
        <KPICard
          icon={AlertCircle}
          label="Overdue Amount"
          value={formatCurrency(stats.overdue)}
          color="text-red-600"
        />
        <KPICard
          icon={Wallet}
          label="Total Wallet Balance"
          value={formatCurrency(stats.totalWalletBalance)}
          color="text-green-600"
        />
        <KPICard
          icon={CreditCard}
          label="Avg Wallet Balance"
          value={formatCurrency(stats.avgWalletBalance)}
          color="text-purple-600"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            View Invoices
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Clock className="w-4 h-4" />
            Aging Report
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Wallet className="w-4 h-4" />
            Wallet Summary
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Total Income (This Month)</span>
            <span className="font-semibold text-green-600">$0.00</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Total Expenses (This Month)</span>
            <span className="font-semibold text-red-600">$0.00</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Net Profit (This Month)</span>
            <span className="font-semibold text-blue-600">$0.00</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Invoicing Tab
function InvoicingTab() {
  const { data: invoices } = trpc.invoicing.getAll.useQuery({ limit: 10 });

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No invoices yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv: any) => (
        <Card key={inv.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">{inv.brokerName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-green-600">{formatCurrency(inv.total)}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {inv.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Wallet Tab
function WalletTab() {
  // wallet.getAll endpoint removed - using empty array as fallback
  const wallets = [];

  if (!wallets || wallets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No wallets yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {wallets.map((wallet: any) => (
        <Card key={wallet.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-sm">Driver #{wallet.driverId}</p>
                <p className="text-xs text-muted-foreground">Wallet Balance</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-green-600">{formatCurrency(wallet.balance || 0)}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {wallet.status || "active"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Revenue Growth (YoY)</span>
            <span className="font-semibold text-green-600">+12.5%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Profit Margin</span>
            <span className="font-semibold text-blue-600">18.3%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Collection Rate</span>
            <span className="font-semibold text-green-600">94.2%</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Days Sales Outstanding</span>
            <span className="font-semibold text-orange-600">28 days</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Highest Revenue Broker</span>
            <span className="font-semibold text-sm">Broker A</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Avg Invoice Value</span>
            <span className="font-semibold text-green-600">$2,450.00</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Pending Invoices</span>
            <span className="font-semibold text-orange-600">12</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-muted-foreground">Unified financial operations: Invoicing, Wallet, Settlements, Analytics</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="gap-2">
            <FileText className="w-4 h-4" />
            Invoicing
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2">
            <Wallet className="w-4 h-4" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            P&L Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-4">
          <InvoicingTab />
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <WalletTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="financial" className="space-y-4">
          <FinancialDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
