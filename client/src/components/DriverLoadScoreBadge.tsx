import { Badge } from "@/components/ui/badge";
import {
  ProfitabilityScore,
  getScoreColor,
  getScoreLabel,
} from "@/lib/driverLoadEconomics";

interface DriverLoadScoreBadgeProps {
  score: ProfitabilityScore;
  hourlyRate: number | null;
  className?: string;
}

/**
 * Color-coded profitability badge for driver loads
 * 
 * Excellent: hourlyRate >= $30/h (green)
 * Good: hourlyRate >= $22/h (blue)
 * Caution: hourlyRate >= $16/h (yellow)
 * Low: hourlyRate < $16/h (red)
 * Unknown: no hourlyRate (gray)
 */
export function DriverLoadScoreBadge({
  score,
  hourlyRate,
  className = "",
}: DriverLoadScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`${colorClass} border font-semibold`}>{label}</Badge>
      {hourlyRate !== null && (
        <span className="text-sm text-gray-600">
          ${hourlyRate.toFixed(0)}/h
        </span>
      )}
    </div>
  );
}
