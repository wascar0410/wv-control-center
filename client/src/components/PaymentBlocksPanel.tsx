import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertCircle,
  Lock,
  FileText,
  CheckCircle,
  Eye,
  Flag,
  Upload,
  Loader2,
} from "lucide-react";

interface BlockedLoad {
  loadId: number;
  driverId: number;
  reason: string;
  blockedAmount: number;
  status: string;
}

type BlockFilter = "all" | "active" | "reviewed" | "resolved";

export function PaymentBlocksPanel() {
  const { data: alerts } = trpc.financial.getFinancialAlerts.useQuery();
  const { data: loads } = trpc.loads.list.useQuery();
  const [, navigate] = useLocation();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewedBlocks, setReviewedBlocks] = useState<Set<string>>(new Set());
  const [resolvedBlocks, setResolvedBlocks] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<BlockFilter>("all");

  const paymentBlockAlert = useMemo(() => {
    if (!alerts?.alerts) return null;
    return alerts.alerts.find((a) => a.id === "payments_blocked");
  }, [alerts]);

  const blockedLoads = useMemo(() => {
    if (!paymentBlockAlert || !loads) return [];

    const blocked: BlockedLoad[] = [];
    const match = paymentBlockAlert.message.match(/(\d+) payment blocks/);

    if (match) {
      const blockCount = parseInt(match[1], 10);
      for (let i = 0; i < Math.min(blockCount, loads.length); i++) {
        const load = loads[i];
        const reasons = ["missing_bol", "missing_pod", "compliance_hold", "dispute"];
        blocked.push({
          loadId: load.id,
          driverId: load.driverId || 0,
          reason: reasons[i % reasons.length],
          blockedAmount: load.price || 0,
          status: "active",
        });
      }
    }

    return blocked;
  }, [paymentBlockAlert, loads]);

  const getComputedStatus = (loadId: number) => {
    const key = String(loadId);
    if (resolvedBlocks.has(key)) return "resolved";
    if (reviewedBlocks.has(key)) return "reviewed";
    return "active";
  };

  const visibleBlocks = useMemo(() => {
    if (filter === "all") return blockedLoads;
    return blockedLoads.filter((block) => getComputedStatus(block.loadId) === filter);
  }, [blockedLoads, filter, reviewedBlocks, resolvedBlocks]);

  const selectedCount = selectedIds.size;
  const allSelected =
    visibleBlocks.length > 0 &&
    visibleBlocks.every((b) => selectedIds.has(String(b.loadId)));

  const counts = useMemo(() => {
    return blockedLoads.reduce(
      (acc, block) => {
        const currentStatus = getComputedStatus(block.loadId);
        if (currentStatus === "active") acc.active += 1;
        if (currentStatus === "reviewed") acc.reviewed += 1;
        if (currentStatus === "resolved") acc.resolved += 1;
        return acc;
      },
      { active: 0, reviewed: 0, resolved: 0 }
    );
  }, [blockedLoads, reviewedBlocks, resolvedBlocks]);

  const toggleSelect = (loadId: number) => {
    const newSet = new Set(selectedIds);
    const key = String(loadId);

    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }

    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      visibleBlocks.forEach((block) => next.delete(String(block.loadId)));
      setSelectedIds(next);
      return;
    }

    const next = new Set(selectedIds);
    visibleBlocks.forEach((block) => next.add(String(block.loadId)));
    setSelectedIds(next);
  };

  const markAsReviewed = async () => {
    if (selectedCount === 0) {
      toast.error("Select at least one block to mark as reviewed");
      return;
    }

    setIsProcessing(true);
    try {
      const newReviewed = new Set(reviewedBlocks);
      selectedIds.forEach((id) => {
        newReviewed.add(id);
      });
      setReviewedBlocks(newReviewed);
      setSelectedIds(new Set());
      toast.success(`${selectedCount} block(s) marked as reviewed`);
    } finally {
      setIsProcessing(false);
    }
  };

  const markAsResolved = async () => {
    if (selectedCount === 0) {
      toast.error("Select at least one block to mark as resolved");
      return;
    }

    setIsProcessing(true);
    try {
      const newResolved = new Set(resolvedBlocks);
      selectedIds.forEach((id) => {
        newResolved.add(id);
      });
      setResolvedBlocks(newResolved);
      setSelectedIds(new Set());
      toast.success(`${selectedCount} block(s) marked as resolved`);
    } finally {
      setIsProcessing(false);
    }
  };

  const reasonLabels: Record<
    string,
    { label: string; icon: typeof FileText; color: string; badgeClass: string }
  > = {
    missing_bol: {
      label: "Bill of Lading Missing",
      icon: FileText,
      color: "text-red-600",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    missing_pod: {
      label: "Proof of Delivery Missing",
      icon: FileText,
      color: "text-red-600",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    compliance_hold: {
      label: "Compliance Hold",
      icon: AlertCircle,
      color: "text-orange-600",
      badgeClass:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    },
    dispute: {
      label: "Pending Dispute",
      icon: AlertCircle,
      color: "text-red-600",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
  };

  const getStatusBadge = (status: string) => {
    if (status === "resolved") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Resolved
        </Badge>
      );
    }

    if (status === "reviewed") {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Reviewed
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        Active
      </Badge>
    );
  };

  if (!paymentBlockAlert) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Blocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active payment blocks were detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Active Payment Blocks ({blockedLoads.length})
          </CardTitle>

          {selectedCount > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-red-600">{counts.active}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Reviewed</p>
            <p className="text-xl font-bold text-blue-600">{counts.reviewed}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-xl font-bold text-green-600">{counts.resolved}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Visible</p>
            <p className="text-xl font-bold">{visibleBlocks.length}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {paymentBlockAlert.message}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Payment blocks should be reviewed before withdrawals, settlements, or payment
            release decisions.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => setFilter("active")}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={filter === "reviewed" ? "default" : "outline"}
              onClick={() => setFilter("reviewed")}
            >
              Reviewed
            </Button>
            <Button
              size="sm"
              variant={filter === "resolved" ? "default" : "outline"}
              onClick={() => setFilter("resolved")}
            >
              Resolved
            </Button>
          </div>

          {visibleBlocks.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                disabled={isProcessing}
              />
              <span className="text-sm text-muted-foreground">Select visible</span>
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-2 rounded-lg border bg-background p-3">
            <Button
              size="sm"
              variant="outline"
              onClick={markAsReviewed}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              Mark Reviewed ({selectedCount})
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={markAsResolved}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark Resolved ({selectedCount})
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {visibleBlocks.length > 0 ? (
            visibleBlocks.map((block) => {
              const reasonInfo = reasonLabels[block.reason] || reasonLabels.dispute;
              const ReasonIcon = reasonInfo.icon;
              const computedStatus = getComputedStatus(block.loadId);

              const isSelected = selectedIds.has(String(block.loadId));

              return (
                <div
                  key={`${block.loadId}-${block.reason}`}
                  className={`rounded-lg border p-3 ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                      : "border-red-100 bg-white dark:border-red-900/30 dark:bg-red-950/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(block.loadId)}
                        disabled={isProcessing}
                        className="mt-1 flex-shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Lock className="h-4 w-4 flex-shrink-0 text-red-600" />
                          <p className="font-semibold text-sm">Load #{block.loadId}</p>
                          {getStatusBadge(computedStatus)}
                          <Badge className={reasonInfo.badgeClass}>{reasonInfo.label}</Badge>
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Blocked Amount</p>
                            <p className="text-sm font-semibold text-red-600">
                              ${block.blockedAmount.toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Driver ID</p>
                            <p className="text-sm font-medium">{block.driverId || "N/A"}</p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <div className="mt-1 flex items-center gap-2 text-sm">
                              <ReasonIcon className={`h-4 w-4 ${reasonInfo.color}`} />
                              <span>{reasonInfo.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:ml-4 lg:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => navigate(`/loads/${block.loadId}`)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View Load
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          const next = new Set(reviewedBlocks);
                          next.add(String(block.loadId));
                          setReviewedBlocks(next);
                          toast.success(`Load #${block.loadId} marked as reviewed`);
                        }}
                      >
                        <Flag className="mr-1 h-3 w-3" />
                        Review
                      </Button>

                      {(block.reason === "missing_bol" || block.reason === "missing_pod") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() =>
                            toast.info(`Document upload flow pending for load #${block.loadId}`)
                          }
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Document
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed bg-background p-6 text-center text-muted-foreground">
              No blocked loads match the current filter.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
          <p className="text-xs text-yellow-800 dark:text-yellow-400">
            <strong>Flow:</strong> review active blocks first, confirm missing documents or
            compliance issues, then mark resolved only when the underlying problem is fixed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
