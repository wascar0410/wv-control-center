import { AlertCircle, TrendingUp, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfitabilitySuggestionProps {
  margin: number;
}

export function ProfitabilitySuggestion({ margin }: ProfitabilitySuggestionProps) {
  if (margin < 8) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          High Risk
        </Badge>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400">
            <Lightbulb className="h-3 w-3" />
            <span>Consider renegotiating rate</span>
          </div>
          <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400">
            <Lightbulb className="h-3 w-3" />
            <span>Review fuel/toll costs</span>
          </div>
        </div>
      </div>
    );
  }

  if (margin > 15) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          High Profitability
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Watchlist
      </Badge>
    </div>
  );
}
