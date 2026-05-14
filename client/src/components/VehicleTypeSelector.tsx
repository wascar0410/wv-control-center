/**
 * VehicleTypeSelector.tsx
 * Selector for vehicle type with operating cost breakdown
 * 
 * Uses canonical vehicle profiles from @/utils/vehicle-costs
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { toMoney } from "@/utils/number";
import { VEHICLE_PROFILES, type VehicleType } from "@/utils/vehicle-costs";

export type { VehicleType };

interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
  showBreakdown?: boolean;
}

export { VehicleTypeSelector };

function VehicleTypeSelector({
  value,
  onChange,
  showBreakdown = true,
}: VehicleTypeSelectorProps) {
  const selectedProfile = VEHICLE_PROFILES[value];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-blue-600" />
        <label className="text-sm font-medium">Vehicle Type</label>
      </div>

      <Select value={value} onValueChange={(v) => onChange(v as VehicleType)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select vehicle type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(VEHICLE_PROFILES).map(([key, profile]) => (
            <SelectItem key={key} value={key}>
              {profile.label} ({toMoney(profile.costPerMile)}/mi)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showBreakdown && selectedProfile && (
        <Card className="bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{selectedProfile.label} - Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Fuel:</span>
              <span className="font-mono">{toMoney(selectedProfile.fuelPerMile)}/mi</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance:</span>
              <span className="font-mono">{toMoney(selectedProfile.maintenancePerMile)}/mi</span>
            </div>
            <div className="flex justify-between">
              <span>Tires:</span>
              <span className="font-mono">{toMoney(selectedProfile.tirePerMile)}/mi</span>
            </div>
            <div className="flex justify-between">
              <span>Depreciation:</span>
              <span className="font-mono">{toMoney(selectedProfile.depreciationPerMile)}/mi</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance:</span>
              <span className="font-mono">{toMoney(selectedProfile.insuranceExposurePerMile)}/mi</span>
            </div>
            <div className="flex justify-between">
              <span>Risk Buffer:</span>
              <span className="font-mono">{toMoney(selectedProfile.riskBufferPerMile)}/mi</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Operating Cost:</span>
              <span className="font-mono text-green-700">{toMoney(selectedProfile.costPerMile)}/mi</span>
            </div>
            <div className="text-xs text-slate-600 pt-2">
              Capacity: {selectedProfile.capacityDescription} | Max Weight: {selectedProfile.maxWeightLbs.toLocaleString()} lbs
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
