import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Siren,
} from "lucide-react";

type ReconciliationStatus =
  | "OK"
  | "Missing"
  | "Mismatch"
  | "Underpaid"
  | "Overpaid"
  | string;

type ReconciliationRow = {
  loadId: number | string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  variance: number;
  status: ReconciliationStatus;
  invoiceDate?: string | Date | null;
  transactionDate?: string | Date | null;
  hasInvoice?: boolean;
  hasTransaction?: boolean;
};

export function ReconciliationPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "OK" | "Missing" | "Mismatch" | "Underpaid" | "Overpaid"
  >("ALL");
  const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(false);

  const { data: reconciliation, isLoading } =
    trpc.financialExtended.getReconciliationData.useQuery(undefined, {
      refetchInterval: 30000,
    });

  const rows: ReconciliationRow[] = reconciliation?.reconciliations ?? [];

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

  const filteredRows = useMemo(() => {
    return rows.filter((rec) => {
      const matchesSearch =
        search.trim() === "" ||
        String(rec.loadId).toLowerCase().includes(search.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ? true : rec.status === statusFilter;

      const matchesDiscrepancyToggle = showOnlyDiscrepancies
        ? rec.status !== "OK"
        : true;

      return matchesSearch && matchesStatus && matchesDiscrepancyToggle;
    });
  }, [rows, search, statusFilter, showOnlyDiscrepancies]);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.status === "OK") acc.ok += 1;
        else if (row.status === "Missing") acc.missing += 1;
        else if (row.status === "Mismatch") acc.mismatch += 1;
        else if (row.status === "Underpaid") acc.underpaid += 1;
        else if (row.status === "Overpaid") acc.overpaid += 1;
        else acc.other += 1;
        return acc;
      },
      {
        ok: 0,
        missing: 0,
        mismatch: 0,
        underpaid: 0,
        overpaid: 0,
        other: 0,
      }
    );
  }, [rows]);

  const prioritySummary = useMemo(() => {
    const urgent = counts.missing;
    const high = counts.underpaid;
    const medium = counts.overpaid + counts.mismatch;

    let headline = "Reconciliation is in good shape";
    let toneClass = "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20";
    let textClass = "text-green-800 dark:text-green-300";

    if (urgent > 0) {
      headline = "Urgent review required: missing payments detected";
      toneClass = "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20";
      textClass = "text-red-800 dark:text-red-300";
    } else if (high > 0) {
      headline = "High priority review: underpaid loads detected";
      toneClass = "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20";
      textClass = "text-orange-800 dark:text-orange-300";
    } else if (medium > 0) {
      headline = "Medium priority review: overpaid or mismatched loads detected";
      toneClass = "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20";
      textClass = "text-yellow-800 dark:text-yellow-300";
    }

    return {
      urgent,
      high,
      medium,
      headline,
      toneClass,
      textClass,
    };
  }, [counts]);

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
      case "Underpaid":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 flex items-center gap-1">
            <ArrowDownCircle className="h-3 w-3" />
            Underpaid
          </Badge>
        );
      case "Overpaid":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
            <ArrowUpCircle className="h-3 w-3" />
            Overpaid
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

  const formatVariance = (value: number) => {
    return `${Number(value || 0).toFixed(2)}%`;
  };

  const getDifferenceClassName = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getVarianceClassName = (status: string) => {
    if (status === "OK") return "text-green-600 dark:text-green-400";
    if (status === "Missing") return "text-red-600 dark:text-red-400";
    if (status === "Mismatch") return "text-yellow-600 dark:text-yellow-400";
    if (status === "Underpaid") return "text-orange-600 dark:text-orange-400";
    if (status === "Overpaid") return "text-blue-600 dark:text-blue-400";
    return "text-muted-foreground";
  };

  const getRowClassName = (status: string) => {
    if (status === "Missing") {
      return "bg-red-50/60 dark:bg-red-950/10";
    }
    if (status === "Underpaid") {
      return "bg-orange-50/60 dark:bg-orange-950/10";
    }
    if (status === "Overpaid") {
      return "bg-blue-50/60 dark:bg-blue-950/10";
    }
    if (status === "Mismatch") {
      return "bg-yellow-50/60 dark:bg-yellow-950/10";
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:gap-3">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Expected</p>
            <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.totalExpected)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Actual</p>
            <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalActual)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs font-medium text-muted-foreground">Difference</p>
            <p
              className={`text-lg md:text-xl font-bold ${getDifferenceClassName(
                summary.totalDifference
              )}`}
            >
              {formatCurrency(summary.totalDifference)}
            </p>
          </CardContent>
        </Card>

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

      <Card className={prioritySummary.toneClass}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Siren className={`mt-0.5 h-5 w-5 ${prioritySummary.textClass}`} />
            <div className="space-y-2">
              <p className={`font-semibold ${prioritySummary.textClass}`}>
                {prioritySummary.headline}
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Priority 1</p>
                  <p className="mt-1 text-sm font-medium">Missing payments</p>
                  <p className="text-lg font-bold text-red-600">{prioritySummary.urgent}</p>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Priority 2</p>
                  <p className="mt-1 text-sm font-medium">Underpaid loads</p>
                  <p className="text-lg font-bold text-orange-600">{prioritySummary.high}</p>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Priority 3</p>
                  <p className="mt-1 text-sm font-medium">Overpaid + mismatch</p>
                  <p className="text-lg font-bold text-yellow-600">{prioritySummary.medium}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended review order: Missing → Underpaid → Overpaid / Mismatch → OK.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">OK</p>
            <p className="text-xl font-bold">{counts.ok}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Missing</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {counts.missing}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Underpaid</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {counts.underpaid}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Overpaid</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {counts.overpaid}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Filtered Rows</p>
            <p className="text-xl font-bold">{filteredRows.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">
              Reconciliation Details
              {summary.discrepancies > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {summary.discrepancies} discrepanc{summary.discrepancies !== 1 ? "ies" : "y"}
                </Badge>
              )}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {rows.length} total rows
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Load ID"
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "ALL"
                    | "OK"
                    | "Missing"
                    | "Mismatch"
                    | "Underpaid"
                    | "Overpaid"
                )
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="OK">OK</option>
              <option value="Missing">Missing</option>
              <option value="Underpaid">Underpaid</option>
              <option value="Overpaid">Overpaid</option>
              <option value="Mismatch">Mismatch</option>
            </select>

            <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={showOnlyDiscrepancies}
                onChange={(e) => setShowOnlyDiscrepancies(e.target.checked)}
              />
              Show only discrepancies
            </label>
          </div>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="font-medium">No reconciliation data available</p>
              <p className="mt-1 text-sm">
                Once invoices and wallet transactions are available, results will appear here.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="font-medium">No rows match the current filters</p>
              <p className="mt-1 text-sm">
                Try clearing the search or changing the selected status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-3 text-left font-semibold">Load ID</th>
                    <th className="px-2 py-3 text-right font-semibold">Expected</th>
                    <th className="px-2 py-3 text-right font-semibold">Actual</th>
                    <th className="px-2 py-3 text-right font-semibold">Difference</th>
                    <th className="px-2 py-3 text-center font-semibold">Variance</th>
                    <th className="px-2 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((rec, idx) => (
                    <tr
                      key={`${rec.loadId}-${idx}`}
                      className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50 ${getRowClassName(
                        rec.status
                      )}`}
                    >
                      <td className="px-2 py-3 font-medium">#{rec.loadId}</td>

                      <td className="px-2 py-3 text-right">
                        {formatCurrency(rec.expectedAmount)}
                      </td>

                      <td className="px-2 py-3 text-right">
                        {formatCurrency(rec.actualAmount)}
                      </td>

                      <td
                        className={`px-2 py-3 text-right font-semibold ${getDifferenceClassName(
                          rec.difference
                        )}`}
                      >
                        {formatCurrency(rec.difference)}
                      </td>

                      <td
                        className={`px-2 py-3 text-center font-medium ${getVarianceClassName(
                          rec.status
                        )}`}
                      >
                        {formatVariance(rec.variance)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(rec.status)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
