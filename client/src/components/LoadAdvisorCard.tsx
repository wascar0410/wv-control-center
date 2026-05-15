/**
 * LoadAdvisorCard.tsx
 * Professional AI Load Advisor UI Component
 * Displays recommendation, pricing, and risk analysis
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  analyzeLoadAdvanced,
  getRecommendationColor,
  getRecommendationEmoji,
  formatRiskFlags,
} from "@/utils/load-advisor";
import { toMoney, toDisplay } from "@/utils/number";

interface LoadAdvisorCardProps {
  load: any;
  compact?: boolean;
}

export default function LoadAdvisorCard({ load, compact = false }: LoadAdvisorCardProps) {
  const analysis = analyzeLoadAdvanced(load);
  const color = getRecommendationColor(analysis.recommendation);
  const emoji = getRecommendationEmoji(analysis.recommendation);
  
  // 💰 Keep raw numbers for logic, format only for display
  const rawProfit = analysis.profit ?? 0;
  const rawRatePerMile = analysis.ratePerMile ?? 0;
  const rawPrice = analysis.price ?? 0;
  const rawSuggestedMinimum = analysis.suggestedMinimum ?? 0;
  const rawSuggestedTarget = analysis.suggestedTarget ?? 0;

  // If load is blocked (missing coordinates), show warning
  if (analysis.block) {
    const blockColor = "bg-red-500/20 text-red-300 border-red-500/50";
    if (compact) {
      return (
        <div className={`p-3 rounded-lg border ${blockColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm">BLOCKED</p>
                <p className="text-xs opacity-75">Missing route data</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <Card className={`border-2 ${blockColor}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            BLOCKED - Cannot Evaluate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">This load cannot be evaluated by AI because it is missing route coordinates.</p>
          <p className="text-xs text-muted-foreground">Reason: {analysis.reasoning}</p>
          <p className="text-xs text-muted-foreground mt-2">Action: Geocoding backfill required to populate coordinates.</p>
        </CardContent>
      </Card>
    );
  }

  const colorClasses = {
    green: "bg-green-500/20 text-green-300 border-green-500/50",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
    red: "bg-red-500/20 text-red-300 border-red-500/50",
    gray: "bg-gray-500/20 text-gray-300 border-gray-500/50",
  };

  const riskBadgeColors: Record<string, string> = {
    LOW_PAY: "bg-orange-500/20 text-orange-300",
    CRITICAL_LOW_PAY: "bg-red-500/20 text-red-300",
    SHORT_LOAD: "bg-blue-500/20 text-blue-300",
    LONG_HAUL: "bg-purple-500/20 text-purple-300",
    NO_COORDS: "bg-red-500/20 text-red-300",
    INCOMPLETE_ADDRESS: "bg-red-500/20 text-red-300",
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <div>
              <p className="font-semibold text-sm">{analysis.recommendation}</p>
              <p className="text-xs opacity-75">${toMoney(rawRatePerMile)}/mi • ${toMoney(rawProfit)} profit</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">${toMoney(rawSuggestedTarget)}</p>
            <p className="text-xs opacity-75">Target</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            {analysis.recommendation}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {analysis.confidence.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rate Per Mile + Profit */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-2 bg-background/50 rounded">
            <p className="text-xs text-muted-foreground">Rate/Mile</p>
            <p className="font-semibold text-sm">${toMoney(rawRatePerMile)}</p>
          </div>
          <div className="p-2 bg-background/50 rounded">
            <p className="text-xs text-muted-foreground">Miles</p>
            <p className="font-semibold text-sm">{toDisplay(analysis.miles, 0)}</p>
          </div>
          <div className="p-2 bg-background/50 rounded">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-semibold text-sm">${toMoney(rawPrice)}</p>
          </div>
          <div className={`p-2 rounded ${rawProfit > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className={`font-bold text-sm ${rawProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${toMoney(rawProfit)}
            </p>
          </div>
        </div>

        {/* Pricing Recommendations */}
        {analysis.recommendation !== "UNKNOWN" && (
          <div className="space-y-2 p-3 bg-background/50 rounded">
            <p className="text-xs font-semibold text-muted-foreground">💰 PRICING RECOMMENDATIONS</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Minimum</p>
                <p className="font-bold text-green-400">${toMoney(rawSuggestedMinimum)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target (Negotiate)</p>
                <p className="font-bold text-yellow-400">${toMoney(rawSuggestedTarget)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="p-3 bg-background/50 rounded">
          <p className="text-xs font-semibold text-muted-foreground mb-1">🧠 ANALYSIS</p>
          <p className="text-sm">{analysis.reasoning}</p>
        </div>

        {/* Risk Flags */}
        {analysis.riskFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">⚠️ RISK FLAGS</p>
            <div className="flex flex-wrap gap-2">
              {analysis.riskFlags.map((flag) => (
                <Badge
                  key={flag}
                  variant="outline"
                  className={`text-xs ${riskBadgeColors[flag] || "bg-gray-500/20 text-gray-300"}`}
                >
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
