import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MarginTrendIndicatorProps {
  recentMargins?: number[];
  currentMargin?: number;
}

export function MarginTrendIndicator({
  recentMargins = [],
  currentMargin = 0,
}: MarginTrendIndicatorProps) {
  const trend = useMemo(() => {
    if (recentMargins.length < 2) return "stable";

    const avgOlder = recentMargins.slice(0, Math.floor(recentMargins.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(recentMargins.length / 2);
    const avgNewer = recentMargins.slice(Math.floor(recentMargins.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(recentMargins.length / 2);

    const diff = avgNewer - avgOlder;
    if (diff > 1) return "up";
    if (diff < -1) return "down";
    return "stable";
  }, [recentMargins]);

  const getTrendBadge = () => {
    switch (trend) {
      case "up":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Improving</span>
          </Badge>
        );
      case "down":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            <span>Declining</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Minus className="h-3 w-3" />
            <span>Stable</span>
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-muted-foreground">Margin Trend (7d)</div>
      <div className="flex items-center gap-2">
        {getTrendBadge()}
        <span className="text-xs text-muted-foreground">
          Current: {currentMargin.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
