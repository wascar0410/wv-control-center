import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, TrendingDown, DollarSign, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinancialAlert {
  id: string;
  type: "critical" | "warning";
  title: string;
  message: string;
  severity: "critical" | "warning";
  timestamp: Date;
  recommendation?: string;
  source?: string;
}

export function FinancialAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Fetch financial alerts
  const { data: alertsData, isLoading } = trpc.financialExtended.getFinancialAlerts.useQuery();

  const alerts = alertsData?.alerts || [];
  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getAlertIcon = (severity: "critical" | "warning") => {
    if (severity === "critical") {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getAlertBadgeVariant = (severity: "critical" | "warning") => {
    return severity === "critical" ? "destructive" : "secondary";
  };

  const getRecommendation = (alertId: string, message: string): string => {
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
    if (alertId === "payment_blocks") {
      return <Lock className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading financial alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
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
              className={`border rounded-lg p-4 space-y-3 ${
                alert.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <h4
                      className={`font-semibold text-sm ${
                        alert.severity === "critical" ? "text-red-900" : "text-yellow-900"
                      }`}
                    >
                      {alert.title}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${
                        alert.severity === "critical" ? "text-red-800" : "text-yellow-800"
                      }`}
                    >
                      {alert.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground ml-2"
                >
                  ✕
                </button>
              </div>

              {/* Recommendation */}
              <div className="flex gap-2 ml-8 p-3 bg-white bg-opacity-60 rounded">
                <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                  Recommendation:
                </span>
                <p className="text-xs text-muted-foreground">
                  {getRecommendation(alert.id, alert.message)}
                </p>
              </div>

              {/* Source Badge */}
              <div className="flex items-center gap-2 ml-8">
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
