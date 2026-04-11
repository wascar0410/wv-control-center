/**
 * DispatchFilterPanel.tsx
 * Left sidebar with filters and quick views
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DispatchFilters } from "@/hooks/useDispatchFilters";
import { X } from "lucide-react";

interface DispatchFilterPanelProps {
  filters: DispatchFilters;
  onFilterChange: (filters: Partial<DispatchFilters>) => void;
  onApplyQuickView: (view: "urgent" | "high_margin" | "at_risk" | "unassigned" | "pending") => void;
}

const STATUS_OPTIONS = ["available", "quoted", "assigned", "in_transit", "delivered", "invoiced", "paid"];

export default function DispatchFilterPanel({
  filters,
  onFilterChange,
  onApplyQuickView,
}: DispatchFilterPanelProps) {
  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFilterChange({ status: newStatus });
  };

  const handleMarginChange = (value: number[]) => {
    onFilterChange({ marginRange: [value[0], value[1]] });
  };

  const handleSearchChange = (value: string) => {
    onFilterChange({ search: value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      status: [],
      marginRange: [0, 50],
      search: "",
    });
  };

  return (
    <div className="w-64 border-r bg-secondary/30 p-4 overflow-y-auto space-y-6">
      {/* Quick Views */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Quick Views</h3>
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onApplyQuickView("urgent")}
          >
            🔴 Urgent
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onApplyQuickView("high_margin")}
          >
            💰 High Margin
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onApplyQuickView("at_risk")}
          >
            ⚠️ At Risk
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onApplyQuickView("unassigned")}
          >
            📦 Unassigned
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onApplyQuickView("pending")}
          >
            ⏳ Pending
          </Button>
        </div>
      </div>

      {/* Search */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Search</Label>
        <Input
          placeholder="Load ID, client, merchandise..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Status</Label>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.status.includes(status)}
                onCheckedChange={() => handleStatusToggle(status)}
              />
              <Label htmlFor={`status-${status}`} className="text-sm capitalize cursor-pointer">
                {status}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Margin Range */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Margin Range</Label>
        <div className="space-y-2">
          <Slider
            value={filters.marginRange}
            onValueChange={handleMarginChange}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground text-center">
            {filters.marginRange[0]}% - {filters.marginRange[1]}%
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={handleClearFilters}
      >
        <X className="w-4 h-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  );
}
