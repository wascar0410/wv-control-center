/**
 * VehicleTypeSelector.tsx
 * Selector for vehicle type with operating cost breakdown
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

export type VehicleType = "cargo_van" | "sprinter" | "box_truck" | "semi_truck";

export interface VehicleProfile {
  name: string;
  costPerMile: number;
  fuel: number;
  maintenance: number;
  tires: number;
  depreciation: number;
  risk: number;
  maxWeight: number;
  capacity: string;
}

export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  cargo_van: {
    name: "Cargo Van",
    costPerMile: 0.56,
    fuel: 0.28,
    maintenance: 0.08,
    tires: 0.03,
    depreciation: 0.12,
    risk: 0.05,
    maxWeight: 3500,
    capacity: "500-1500 lbs",
  },
  sprinter: {
    name: "Sprinter Van",
    costPerMile: 0.68,
    fuel: 0.35,
    maintenance: 0.10,
    tires: 0.04,
    depreciation: 0.14,
    risk: 0.05,
    maxWeight: 5000,
    capacity: "1500-3000 lbs",
  },
  box_truck: {
    name: "Box Truck",
    costPerMile: 0.85,
    fuel: 0.42,
    maintenance: 0.12,
    tires: 0.05,
    depreciation: 0.18,
    risk: 0.08,
    maxWeight: 10000,
    capacity: "3000-8000 lbs",
  },
  semi_truck: {
    name: "Semi Truck",
    costPerMile: 1.15,
    fuel: 0.58,
    maintenance: 0.18,
    tires: 0.08,
    depreciation: 0.22,
    risk: 0.09,
    maxWeight: 40000,
    capacity: "20000+ lbs",
  },
};

interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
  showDetails?: boolean;
}

export function VehicleTypeSelector({
  value,
  onChange,
  showDetails = true,
}: VehicleTypeSelectorProps) {
  const profile = VEHICLE_PROFILES[value];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Vehículo</label>
        <Select value={value} onValueChange={(v) => onChange(v as VehicleType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VEHICLE_PROFILES).map(([key, prof]) => (
              <SelectItem key={key} value={key}>
                {prof.name} - {toMoney(prof.costPerMile)}/mi
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showDetails && (
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              {profile.name} - Costos Operativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Cost Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Combustible:</span>
                <span className="font-medium">{toMoney(profile.fuel)}/mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mantenimiento:</span>
                <span className="font-medium">{toMoney(profile.maintenance)}/mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Llantas:</span>
                <span className="font-medium">{toMoney(profile.tires)}/mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depreciación:</span>
                <span className="font-medium">{toMoney(profile.depreciation)}/mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buffer de Riesgo:</span>
                <span className="font-medium">{toMoney(profile.risk)}/mi</span>
              </div>
            </div>

            {/* Total Cost */}
            <div className="border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Costo Total:</span>
                <span className="text-lg font-bold text-primary">
                  {toMoney(profile.costPerMile)}/mi
                </span>
              </div>
            </div>

            {/* Capacity Info */}
            <div className="border-t border-border pt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Capacidad:</span>
                <span>{profile.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span>Peso Máximo:</span>
                <span>{profile.maxWeight.toLocaleString()} lbs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
