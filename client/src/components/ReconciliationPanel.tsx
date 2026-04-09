import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ReconciliationPanel() {
  const { data: reconciliation, isLoading } = trpc.financialExtended.getReconciliationData.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const summary = useMemo(() => {
    if (!reconciliation) {
      return {
        totalExpected: 0,
        totalActual: 0,
        totalDifference: 0,
        discrepancies: 0,
        matchRate: 0,
      };
    }

    const matchRate =
      reconciliation.reconciliations.length > 0
        ? ((reconciliation.reconciliations.length - reconciliation.discrepancies) /
            reconciliation.reconciliations.length) *
          100
        : 0;

    return {
      totalExpected: reconciliation.totalExpected,
      totalActual: reconciliation.totalActual,
      totalDifference: reconciliation.totalDifference,
      discrepancies: reconciliation.discrepancies,
      matchRate,
    };
  }, [reconciliation]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OK":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </Badge>
        );
      case "Missing":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Missing
          </Badge>
        );
      case "Mismatch":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Mismatch
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:gap-3">
        {/* Total Expected */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Expected</p>
            <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.totalExpected)}
            </p>
          </CardContent>
        </Card>

        {/* Total Actual */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Actual</p>
            <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalActual)}
            </p>
          </CardContent>
        </Card>

        {/* Difference */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Difference</p>
            <p
              className={`text-lg md:text-xl font-bold ${
                summary.totalDifference >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(summary.totalDifference)}
            </p>
          </CardContent>
        </Card>

        {/* Match Rate */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Match Rate</p>
            <p
              className={`text-lg md:text-xl font-bold ${
                summary.matchRate >= 95
                  ? "text-green-600 dark:text-green-400"
                  : summary.matchRate >= 80
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {summary.matchRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies Table */}
      {reconciliation && reconciliation.reconciliations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Reconciliation Details
              {summary.discrepancies > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {summary.discrepancies} discrepanc{summary.discrepancies !== 1 ? "ies" : "y"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2 text-left font-semibold">Load ID</th>
                    <th className="px-2 py-2 text-right font-semibold">Expected</th>
                    <th className="px-2 py-2 text-right font-semibold">Actual</th>
                    <th className="px-2 py-2 text-right font-semibold">Difference</th>
                    <th className="px-2 py-2 text-center font-semibold">Variance</th>
                    <th className="px-2 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.reconciliations.map((rec, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-2 py-2 font-medium">#{rec.loadId}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(rec.expectedAmount)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(rec.actualAmount)}</td>
                      <td
                        className={`px-2 py-2 text-right font-semibold ${
                          rec.difference >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(rec.difference)}
                      </td>
                      <td className="px-2 py-2 text-center">{rec.variance}%</td>
                      <td className="px-2 py-2 text-center">{getStatusBadge(rec.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No reconciliation data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
