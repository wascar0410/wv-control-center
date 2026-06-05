/**
 * DriverRecommendationsTab.tsx
 * Displays recommended drivers for a load with scoring breakdown
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Clock, DollarSign, Zap, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { NearbyDriversModal } from "./NearbyDriversModal";

interface Driver {
  id: number;
  name: string;
  email: string;
  driverLatitude: number | null;
  driverLongitude: number | null;
  distanceToPickupMiles: number | null;
  etaToPickupMinutes: number | null;
  deadheadMiles: number | null;
  loadedMiles: number | null;
  totalOperationalMiles: number | null;
  payPerOperationalMile: number | null;
  adjustedEstimatedNet: number | null;
  gpsInactive: boolean;
  availableForLoads: boolean;
  vehicleType: string;
  vehicleName: string;
  vehiclePlate: string;
  fuelCostPerMile: number;
  maintenanceCostPerMile: number;
  totalCostPerMile: number;
  estimatedOperationalCost: number | null;
  lastLocationUpdate: string | null;
}

interface DriverRecommendation {
  driver: Driver;
  score: number;
  recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended";
  breakdown: {
    availability: number;
    gps: number;
    distance: number;
    profitability: number;
  };
}

function calculateDriverScore(driver: Driver, loadPrice: number): DriverRecommendation {
  let availabilityScore = 0;
  let gpsScore = 0;
  let distanceScore = 0;
  let profitabilityScore = 0;

  // Availability Score (0-30)
  availabilityScore = driver.availableForLoads ? 30 : 0;

  // GPS Score (0-20)
  if (!driver.gpsInactive && driver.lastLocationUpdate) {
    const lastUpdateTime = new Date(driver.lastLocationUpdate).getTime();
    const now = Date.now();
    const hoursDiff = (now - lastUpdateTime) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) gpsScore = 20;
    else if (hoursDiff < 24) gpsScore = 15;
    else if (hoursDiff < 24 * 7) gpsScore = 10;
    else gpsScore = 0;
  } else {
    gpsScore = 0;
  }

  // Distance Score (0-20)
  if (driver.distanceToPickupMiles !== null) {
    const dist = driver.distanceToPickupMiles;
    if (dist < 5) distanceScore = 20;
    else if (dist < 10) distanceScore = 18;
    else if (dist < 25) distanceScore = 15;
    else if (dist < 50) distanceScore = 10;
    else if (dist < 100) distanceScore = 5;
    else distanceScore = 0;
  } else {
    distanceScore = 0;
  }

  // Profitability Score (0-30)
  if (driver.adjustedEstimatedNet !== null && loadPrice > 0) {
    const profitPercent = (driver.adjustedEstimatedNet / loadPrice) * 100;
    if (profitPercent > 25) profitabilityScore = 30;
    else if (profitPercent > 15) profitabilityScore = 25;
    else if (profitPercent > 8) profitabilityScore = 20;
    else if (profitPercent > 0) profitabilityScore = 10;
    else profitabilityScore = 0;
  } else {
    profitabilityScore = 0;
  }

  const totalScore = availabilityScore + gpsScore + distanceScore + profitabilityScore;
  
  let recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended" = "not_recommended";
  if (totalScore >= 75) recommendation = "highly_recommended";
  else if (totalScore >= 60) recommendation = "recommended";
  else if (totalScore >= 45) recommendation = "consider";

  return {
    driver,
    score: totalScore,
    recommendation,
    breakdown: {
      availability: availabilityScore,
      gps: gpsScore,
      distance: distanceScore,
      profitability: profitabilityScore,
    },
  };
}

function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const variants: Record<string, { bg: string; icon: any; label: string }> = {
    highly_recommended: { bg: "bg-green-500/20 text-green-300 border-green-500/30", icon: CheckCircle, label: "Altamente Recomendado" },
    recommended: { bg: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: CheckCircle, label: "Recomendado" },
    consider: { bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: AlertCircle, label: "Considerar" },
    not_recommended: { bg: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle, label: "No Recomendado" },
  };
  const v = variants[recommendation] || variants.not_recommended;
  const Icon = v.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${v.bg}`}>
      <Icon className="w-3 h-3" />
      {v.label}
    </span>
  );
}

export function DriverRecommendationsTab({
  loadId,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  loadPrice,
  estimatedTolls,
}: {
  loadId?: number;
  pickupLat: number;
  pickupLng: number;
  deliveryLat?: number;
  deliveryLng?: number;
  loadPrice: number;
  estimatedTolls?: number;
}) {
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const { data: drivers, isLoading } = trpc.nearby.getDrivers.useQuery(
    {
      loadId: loadId || 0,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      loadPrice,
      estimatedTolls,
    },
    { enabled: !!pickupLat && !!pickupLng && !!loadPrice }
  );

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Cargando recomendaciones de choferes...</p>
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay choferes disponibles en este momento</p>
      </div>
    );
  }

  // Calculate scores and sort
  const recommendations = drivers
    .map((driver: any) => calculateDriverScore(driver, loadPrice))
    .sort((a, b) => b.score - a.score);

  // Get top 3
  const topRecommendations = recommendations.slice(0, 3);

  return (
    <div className="space-y-4">
      {topRecommendations.map((rec) => (
        <DriverRecommendationCard
          key={rec.driver.id}
          recommendation={rec}
          loadId={loadId}
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          deliveryLat={deliveryLat}
          deliveryLng={deliveryLng}
          loadPrice={loadPrice}
          estimatedTolls={estimatedTolls}
          onShowNearby={() => setShowNearbyModal(true)}
        />
      ))}
      
      {showNearbyModal && (
        <NearbyDriversModal
          isOpen={showNearbyModal}
          onClose={() => setShowNearbyModal(false)}
          loadId={loadId}
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          deliveryLat={deliveryLat}
          deliveryLng={deliveryLng}
          loadPrice={loadPrice}
          estimatedTolls={estimatedTolls}
        />
      )}
    </div>
  );
}

function DriverRecommendationCard({
  recommendation,
  loadId,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  loadPrice,
  estimatedTolls,
  onShowNearby,
}: {
  recommendation: DriverRecommendation;
  loadId?: number;
  pickupLat: number;
  pickupLng: number;
  deliveryLat?: number;
  deliveryLng?: number;
  loadPrice: number;
  estimatedTolls?: number;
  onShowNearby: () => void;
}) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const assignMutation = trpc.assignment.assign.useMutation({
    onSuccess: () => {
      toast.success(`Carga asignada a ${recommendation.driver.name}`);
      setShowAssignDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAssign = () => {
    if (!loadId) return;
    assignMutation.mutate({
      loadId,
      driverId: recommendation.driver.id,
      notes: `Asignado desde Quote Analyzer - Score: ${recommendation.score}/100`,
    });
  };

  return (
    <>
      <Card className="border-border/50 hover:border-border transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg">{recommendation.driver.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{recommendation.driver.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {recommendation.driver.vehicleName} • {recommendation.driver.vehiclePlate}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{recommendation.score}</div>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
          </div>
          <div className="mt-3">
            <RecommendationBadge recommendation={recommendation.recommendation} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">DESGLOSE DE PUNTUACIÓN</p>
            <div className="space-y-1">
              <ScoreBar label="Disponibilidad" score={recommendation.breakdown.availability} max={30} color="bg-green-600" />
              <ScoreBar label="GPS" score={recommendation.breakdown.gps} max={20} color="bg-blue-600" />
              <ScoreBar label="Distancia" score={recommendation.breakdown.distance} max={20} color="bg-purple-600" />
              <ScoreBar label="Rentabilidad" score={recommendation.breakdown.profitability} max={30} color="bg-orange-600" />
            </div>
          </div>

          {/* Driver Details */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            {recommendation.driver.distanceToPickupMiles !== null && (
              <DetailItem icon={MapPin} label="Distancia" value={`${recommendation.driver.distanceToPickupMiles.toFixed(1)} mi`} />
            )}
            {recommendation.driver.etaToPickupMinutes !== null && (
              <DetailItem icon={Clock} label="ETA" value={`${Math.round(recommendation.driver.etaToPickupMinutes)} min`} />
            )}
            {recommendation.driver.payPerOperationalMile !== null && (
              <DetailItem icon={DollarSign} label="$/Op Mile" value={`$${recommendation.driver.payPerOperationalMile.toFixed(2)}`} />
            )}
            {recommendation.driver.adjustedEstimatedNet !== null && (
              <DetailItem 
                icon={TrendingUp} 
                label="Est. Net" 
                value={`$${recommendation.driver.adjustedEstimatedNet.toFixed(2)}`}
                isPositive={recommendation.driver.adjustedEstimatedNet >= 0}
              />
            )}
            {recommendation.driver.totalOperationalMiles !== null && (
              <DetailItem icon={Zap} label="Op Miles" value={`${recommendation.driver.totalOperationalMiles.toFixed(1)} mi`} />
            )}
          </div>

          {/* GPS Status */}
          {recommendation.driver.gpsInactive && (
            <div className="text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
              ⚠️ Sin ubicación reciente
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => setShowAssignDialog(true)}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? "Asignando..." : "Asignar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onShowNearby}
            >
              Ver Cercanos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assign Confirmation Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Asignación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Asignar esta carga a <strong>{recommendation.driver.name}</strong>?
            </p>
            <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="font-semibold">{recommendation.score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Distancia:</span>
                <span className="font-semibold">
                  {recommendation.driver.distanceToPickupMiles?.toFixed(1) || "N/A"} mi
                </span>
              </div>
              <div className="flex justify-between">
                <span>Est. Net:</span>
                <span className="font-semibold">
                  ${recommendation.driver.adjustedEstimatedNet?.toFixed(2) || "N/A"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Asignando..." : "Confirmar Asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScoreBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${(score / max) * 100}%` }} />
        </div>
        <span className="w-8 text-right font-semibold">{score}/{max}</span>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, isPositive }: { icon: any; label: string; value: string; isPositive?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="text-sm">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-semibold ${isPositive !== undefined ? (isPositive ? "text-green-600" : "text-red-600") : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
