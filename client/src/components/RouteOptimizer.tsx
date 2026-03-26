import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Weight, Zap } from "lucide-react";

interface OptimizedStop {
  stopOrder: number;
  type: "pickup" | "delivery";
  address: string;
  distance: number;
  duration: number;
}

interface RouteOptimizerProps {
  stops: OptimizedStop[];
  totalDistance: number;
  totalDuration: number;
  totalWeight: number;
  isLoading?: boolean;
}

export default function RouteOptimizer({
  stops,
  totalDistance,
  totalDuration,
  totalWeight,
  isLoading = false,
}: RouteOptimizerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Optimizando ruta...</div>
        </CardContent>
      </Card>
    );
  }

  if (stops.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Sin paradas para optimizar</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground">Distancia Total</p>
              <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">millas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">Tiempo Total</p>
              <p className="text-2xl font-bold">{totalDuration.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">horas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Weight className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground">Peso Total</p>
              <p className="text-2xl font-bold">{totalWeight.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">lbs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground">Eficiencia</p>
              <p className="text-2xl font-bold">{(totalWeight / (totalDistance || 1)).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">lbs/milla</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimized Route */}
      <Card>
        <CardHeader>
          <CardTitle>Ruta Optimizada</CardTitle>
          <CardDescription>Orden de paradas optimizado para minimizar distancia y tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {stop.stopOrder}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={stop.type === "pickup" ? "default" : "secondary"} className="text-xs">
                      {stop.type === "pickup" ? "Recogida" : "Entrega"}
                    </Badge>
                    <span className="text-sm font-medium">{stop.address}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {stop.distance.toFixed(1)} mi
                    </span>
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {stop.duration.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Return to Van */}
            <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
                ↩
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">Retorno a Van</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
