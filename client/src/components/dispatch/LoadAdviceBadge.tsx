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

  const tooltipContent = (
    <div className="space-y-2 text-sm">
      <div className="font-semibold">{style.label}</div>
      <div className="border-t border-gray-300 pt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <span>Miles:</span>
          <span className="font-semibold">{advice.financials.miles.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Rate/Mile:</span>
          <span className="font-semibold">${advice.financials.ratePerMile.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Profit:</span>
          <span className="font-semibold text-green-600">
            {formatCurrency(advice.financials.estimatedProfit)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Margin:</span>
          <span className="font-semibold">{advice.financials.estimatedMargin.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Fuel Est:</span>
          <span className="font-semibold">{formatCurrency(advice.financials.fuelCost)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Confidence:</span>
          <span className="font-semibold">{advice.confidence}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
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
    </TooltipProvider>
  );
}
