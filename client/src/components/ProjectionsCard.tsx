import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface ProjectionsData {
  completedMiles: number;
  quotedMiles: number;
  totalMilesActual: number;
  projectedTotalMiles: number;
  milesPercentage: number;
  willReachGoal: boolean;
  
  completedProfit: number;
  quotedProfit: number;
  totalProfitActual: number;
  projectedTotalProfit: number;
  
  dailyAverageMiles: number;
  dailyAverageProfit: number;
  daysPassed: number;
  daysRemaining: number;
  daysInMonth: number;
}

export function ProjectionsCard({ data }: { data: ProjectionsData }) {
  const milesGoal = 4000;
  const goalReached = data.projectedTotalMiles >= milesGoal;
  const milesRemaining = Math.max(0, milesGoal - data.projectedTotalMiles);
  
  const progressPercent = Math.min(100, data.milesPercentage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Miles Projection Card */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Proyección de Millas</CardTitle>
              <CardDescription>Meta mensual: {milesGoal.toLocaleString()} millas</CardDescription>
            </div>
            <Target className={`w-5 h-5 ${goalReached ? "text-green-500" : "text-amber-500"}`} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Progreso</span>
              <span className="font-semibold">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Miles Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-background/50 rounded p-2">
              <div className="text-foreground/60 text-xs">Completadas</div>
              <div className="text-lg font-semibold">{data.completedMiles.toLocaleString()}</div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-foreground/60 text-xs">En Cotización</div>
              <div className="text-lg font-semibold">{data.quotedMiles.toLocaleString()}</div>
            </div>
          </div>

          {/* Projection Summary */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Total Actual</span>
              <span className="font-semibold">{data.totalMilesActual.toLocaleString()} mi</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Proyectado (fin mes)</span>
              <span className={`font-semibold ${goalReached ? "text-green-500" : "text-amber-500"}`}>
                {data.projectedTotalMiles.toLocaleString()} mi
              </span>
            </div>
            {!goalReached && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Falta</span>
                <span className="font-semibold">{milesRemaining.toLocaleString()} mi</span>
              </div>
            )}
          </div>

          {/* Daily Average */}
          <div className="bg-background/50 rounded p-2 text-sm">
            <div className="text-foreground/60 text-xs mb-1">Promedio Diario</div>
            <div className="flex justify-between">
              <span>{data.dailyAverageMiles.toLocaleString()} mi/día</span>
              <span className="text-foreground/60">({data.daysPassed} días pasados)</span>
            </div>
          </div>

          {/* Goal Status Badge */}
          <div className={`rounded p-2 text-center text-sm font-semibold ${
            goalReached 
              ? "bg-green-500/10 text-green-700" 
              : "bg-amber-500/10 text-amber-700"
          }`}>
            {goalReached ? "✓ Meta alcanzable" : "⚠ Meta en riesgo"}
          </div>
        </CardContent>
      </Card>

      {/* Profit Projection Card */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Proyección de Ganancia</CardTitle>
              <CardDescription>Estimado al final del mes</CardDescription>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profit Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-background/50 rounded p-2">
              <div className="text-foreground/60 text-xs">Completada</div>
              <div className="text-lg font-semibold text-green-600">
                ${data.completedProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-foreground/60 text-xs">En Cotización</div>
              <div className="text-lg font-semibold text-blue-600">
                ${data.quotedProfit.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Profit Summary */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Total Actual</span>
              <span className="font-semibold text-green-600">
                ${data.totalProfitActual.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Proyectado (fin mes)</span>
              <span className="font-semibold text-green-600">
                ${data.projectedTotalProfit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Daily Average Profit */}
          <div className="bg-background/50 rounded p-2 text-sm">
            <div className="text-foreground/60 text-xs mb-1">Promedio Diario</div>
            <div className="flex justify-between">
              <span className="font-semibold">${data.dailyAverageProfit.toFixed(2)}/día</span>
              <span className="text-foreground/60">({data.daysRemaining} días restantes)</span>
            </div>
          </div>

          {/* Profit per Mile */}
          <div className="bg-background/50 rounded p-2 text-sm">
            <div className="text-foreground/60 text-xs mb-1">Ganancia por Milla</div>
            <div className="font-semibold">
              ${data.totalMilesActual > 0 
                ? (data.totalProfitActual / data.totalMilesActual).toFixed(2) 
                : "0.00"}/mi
            </div>
          </div>

          {/* Projection Status */}
          <div className="rounded p-2 text-center text-sm font-semibold bg-green-500/10 text-green-700">
            Proyección Positiva
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
