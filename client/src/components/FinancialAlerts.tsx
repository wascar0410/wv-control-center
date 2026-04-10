import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingDown,
  DollarSign,
  Clock,
  Lock,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinancialAlert {
  id: string;
  type: "critical" | "warning";
  title: string;
  message: string;
  severity: "critical" | "warning";
  timestamp?: Date;
  recommendation?: string;
  source?: string;
}

export function FinancialAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: alertsData, isLoading } =
    trpc.financialExtended.getFinancialAlerts.useQuery();

  const alerts = (alertsData?.alerts || []) as FinancialAlert[];
  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;

  const hasPaymentBlocks = visibleAlerts.some((a) => a.id === "payments_blocked");
  const hasOperationalRisk =
    visibleAlerts.some((a) => a.id === "cash_negative") ||
    visibleAlerts.some((a) => a.id === "overdue_invoices") ||
    visibleAlerts.some((a) => a.id === "variance_high") ||
    visibleAlerts.some((a) => a.id === "margin_low");

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getAlertIcon = (severity: "critical" | "warning") => {
    if (severity === "critical") {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getRecommendation = (alertId: string): string => {
    if (alertId === "margin_low") {
      return "Review pricing strategy, reduce operational costs, or negotiate better rates with brokers.";
    }
    if (alertId === "variance_high") {
      return "Analyze quote estimation accuracy. Check fuel costs, toll estimates, and driver efficiency.";
    }
    if (alertId === "cash_negative") {
      return "Prioritize collecting overdue invoices or consider short-term financing to maintain operations.";
    }
    if (alertId === "overdue_invoices") {
      return "Send payment reminders to clients. Consider early payment discounts or collection actions.";
    }
    if (alertId === "payments_blocked") {
      return "Ensure BOL and POD documents are uploaded for all loads. Blocks prevent driver withdrawals.";
    }
    return "Take corrective action to address this financial issue.";
  };

  const getSourceIcon = (alertId: string) => {
    if (alertId === "margin_low" || alertId === "variance_high") {
      return <TrendingDown className="h-4 w-4" />;
    }
    if (alertId === "cash_negative") {
      return <DollarSign className="h-4 w-4" />;
    }
    if (alertId === "overdue_invoices") {
      return <Clock className="h-4 w-4" />;
    }
    if (alertId === "payments_blocked") {
      return <Lock className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  const getFlowHeadline = () => {
    if (hasPaymentBlocks) {
      return "Start with payment blocks, then review reconciliation, then resolve remaining financial alerts.";
    }
    if (hasOperationalRisk) {
      return "Review financial alerts first, then confirm whether reconciliation discrepancies explain the issue.";
    }
    return "No urgent blockers detected. Continue monitoring alerts and reconciliation regularly.";
  };

  const getFlowTone = () => {
    if (hasPaymentBlocks) {
      return {
        box: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20",
        text: "text-red-800 dark:text-red-300",
      };
    }
    if (hasOperationalRisk) {
      return {
        box: "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20",
        text: "text-yellow-800 dark:text-yellow-300",
      };
    }
    return {
      box: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20",
      text: "text-green-800 dark:text-green-300",
    };
  };

  const flowTone = getFlowTone();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading financial alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Financial Alerts</CardTitle>
            <CardDescription>
              {visibleAlerts.length === 0
                ? "No active alerts - all systems operational"
                : `${criticalCount} critical, ${warningCount} warning`}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${flowTone.box}`}>
          <div className="flex items-start gap-3">
            <GitBranch className={`mt-0.5 h-5 w-5 ${flowTone.text}`} />
            <div className="space-y-2">
              <p className={`font-semibold ${flowTone.text}`}>Operational review flow</p>
              <p className="text-sm text-muted-foreground">{getFlowHeadline()}</p>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Step 1</p>
                  <p className="mt-1 text-sm font-medium">Payment Blocks</p>
                  <p className="text-xs text-muted-foreground">
                    Release blockers before cash decisions.
                  </p>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Step 2</p>
                  <p className="mt-1 text-sm font-medium">Reconciliation</p>
                  <p className="text-xs text-muted-foreground">
                    Confirm missing, underpaid, or mismatched payments.
                  </p>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Step 3</p>
                  <p className="mt-1 text-sm font-medium">Financial Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Resolve margin, cash, variance, and overdue risks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {visibleAlerts.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All financial metrics are within acceptable ranges. Continue monitoring your operations.
            </AlertDescription>
          </Alert>
        ) : (
          visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`space-y-3 rounded-lg border p-4 ${
                alert.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <h4
                      className={`text-sm font-semibold ${
                        alert.severity === "critical" ? "text-red-900" : "text-yellow-900"
                      }`}
                    >
                      {alert.title}
                    </h4>
                    <p
                      className={`mt-1 text-sm ${
                        alert.severity === "critical" ? "text-red-800" : "text-yellow-800"
                      }`}
                    >
                      {alert.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="ml-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="ml-8 flex gap-2 rounded bg-white bg-opacity-60 p-3">
                <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">
                  Recommendation:
                </span>
                <p className="text-xs text-muted-foreground">
                  {getRecommendation(alert.id)}
                </p>
              </div>

              <div className="ml-8 flex items-center gap-2">
                {getSourceIcon(alert.id)}
                <span className="text-xs text-muted-foreground">
                  {alert.id === "margin_low" && "Profit Margin"}
                  {alert.id === "variance_high" && "Quote Variance"}
                  {alert.id === "cash_negative" && "Cash Position"}
                  {alert.id === "overdue_invoices" && "Overdue Invoices"}
                  {alert.id === "payments_blocked" && "Payment Blocks"}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
