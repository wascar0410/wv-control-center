import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllocationSettings } from "./AllocationSettings";
import { FinancialAlerts } from "./FinancialAlerts";
import { PaymentBlocksPanel } from "./PaymentBlocksPanel";
import { ReconciliationPanel } from "./ReconciliationPanel";

export function FinancialDashboard() {
  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Financial Overview
                <Badge variant="outline">Hotfix Mode</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Some aggregated financial metrics are temporarily disabled while the
                production database schema is aligned with the current backend model.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Working now</p>
                  <p className="mt-1 text-sm font-medium">
                    Alerts, payment blocks, reconciliation, and settings.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Temporarily limited</p>
                  <p className="mt-1 text-sm font-medium">
                    P&L summary, quote variance, cash flow, and aggregated dashboard metrics.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Next backend fix</p>
                  <p className="mt-1 text-sm font-medium">
                    Align invoices and quote_analysis schema, then re-enable financial router queries.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoicing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section is temporarily disabled in production until the invoices schema
                is updated to match the current backend model.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Wallet summary metrics are temporarily disabled here while the financial
                aggregate routes are stabilized.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>P&amp;L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                P&amp;L calculations are temporarily hidden because the current production
                database is missing fields required by the financial router.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Allocation Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Allocation calculations that depend on the broken financial aggregate routes
                are temporarily disabled. Configuration remains available in Settings.
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
