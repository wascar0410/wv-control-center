import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface LoadAdviceData {
  recommendation: "accept" | "negotiate" | "reject";
  confidence: number;
  financials: {
    miles: number;
    ratePerMile: number;
    estimatedProfit: number;
    estimatedMargin: number;
    fuelCost: number;
    tolls: number;
  };
  currentPrice?: number;
}

interface PriceSuggestions {
  minPrice: number;
  negotiatePrice: number;
  targetPrice: number;
  highPrice: number;
}

interface LoadAdviceBadgeProps {
  advice: LoadAdviceData | null | undefined;
  isLoading?: boolean;
}

export default function LoadAdviceBadge({
  advice,
  isLoading = false,
}: LoadAdviceBadgeProps) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="bg-gray-100">
        Loading...
      </Badge>
    );
  }

  if (!advice) {
    return (
      <Badge variant="outline" className="bg-gray-100">
        N/A
      </Badge>
    );
  }

  // Determine badge styling based on recommendation
  const getBadgeStyle = () => {
    switch (advice.recommendation) {
      case "accept":
        return {
          className: "bg-green-100 text-green-800 border-green-300",
          icon: CheckCircle2,
          label: "ACCEPT",
        };
      case "negotiate":
        return {
          className: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: AlertCircle,
          label: "NEGOTIATE",
        };
      case "reject":
        return {
          className: "bg-red-100 text-red-800 border-red-300",
          icon: XCircle,
          label: "REJECT",
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800 border-gray-300",
          icon: AlertCircle,
          label: "UNKNOWN",
        };
    }
  };

  const style = getBadgeStyle();
  const Icon = style.icon;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate price suggestions
  const getPriceSuggestions = (): PriceSuggestions => {
    const miles = advice.financials.miles || 100;
    return {
      minPrice: Math.round(miles * 2.2 * 100) / 100,
      negotiatePrice: Math.round(miles * 2.5 * 100) / 100,
      targetPrice: Math.round(miles * 2.8 * 100) / 100,
      highPrice: Math.round(miles * 3.2 * 100) / 100,
    };
  };

  // Get contextual insight text
  const getInsightText = (): string => {
    const ratePerMile = advice.financials.ratePerMile || 0;
    if (ratePerMile < 1.8) {
      return "Low rate, consider rejecting or renegotiating";
    } else if (ratePerMile < 2.4) {
      return "Borderline rate, negotiate for better terms";
    } else {
      return "Strong load, good margins - accept";
    }
  };

  const prices = getPriceSuggestions();
  const insight = getInsightText();

  const tooltipContent = (
    <div className="space-y-3 text-sm w-80">
      {/* Recommendation & Insight */}
      <div>
        <div className="font-semibold text-base">{style.label}</div>
        <div className="text-xs text-gray-400 mt-1">{insight}</div>
      </div>

      {/* Current & Suggested Prices */}
      <div className="border-t border-gray-600 pt-2">
        <div className="font-semibold text-xs text-gray-300 mb-2">PRICING ANALYSIS</div>
        <div className="space-y-1.5 text-xs">
          {advice.currentPrice && (
            <div className="flex justify-between gap-4 bg-gray-800 p-1.5 rounded">
              <span className="text-gray-400">Current Price:</span>
              <span className="font-semibold">{formatCurrency(advice.currentPrice)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Min Price:</span>
            <span className="font-semibold text-red-400">{formatCurrency(prices.minPrice)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Negotiate:</span>
            <span className="font-semibold text-yellow-400">{formatCurrency(prices.negotiatePrice)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Target Price:</span>
            <span className="font-semibold text-green-400">{formatCurrency(prices.targetPrice)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">High Price:</span>
            <span className="font-semibold text-blue-400">{formatCurrency(prices.highPrice)}</span>
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="border-t border-gray-600 pt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Miles:</span>
          <span className="font-semibold">{advice.financials.miles.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Rate/Mile:</span>
          <span className="font-semibold">${advice.financials.ratePerMile.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Profit:</span>
          <span className="font-semibold text-green-400">
            {formatCurrency(advice.financials.estimatedProfit)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Margin:</span>
          <span className="font-semibold">{advice.financials.estimatedMargin.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Fuel Est:</span>
          <span className="font-semibold">{formatCurrency(advice.financials.fuelCost)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Confidence:</span>
          <span className="font-semibold">{advice.confidence}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${style.className} cursor-help flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {style.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-slate-900 text-white border-slate-700">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
