import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gift, Zap, TrendingUp, Target } from "lucide-react";

interface BonusProgram {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  current: number;
  target: number;
  bonus: number;
  status: "earned" | "in_progress" | "locked";
  color: string;
}

export function DriverBonusSystem() {
  const bonusPrograms: BonusProgram[] = [
    {
      id: "on_time",
      name: "Entregas a Tiempo",
      description: "Completa 20 entregas a tiempo consecutivas",
      icon: <Zap className="w-5 h-5" />,
      current: 18,
      target: 20,
      bonus: 150,
      status: "in_progress",
      color: "bg-blue-100 text-blue-800",
    },
    {
      id: "rating",
      name: "Calificación Perfecta",
      description: "Mantén 4.9+ de calificación por 30 días",
      icon: <TrendingUp className="w-5 h-5" />,
      current: 25,
      target: 30,
      bonus: 200,
      status: "in_progress",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      id: "miles",
      name: "Millas Bonus",
      description: "Recorre 5,000 millas en el mes",
      icon: <Target className="w-5 h-5" />,
      current: 4250,
      target: 5000,
      bonus: 250,
      status: "in_progress",
      color: "bg-purple-100 text-purple-800",
    },
    {
      id: "referral",
      name: "Referido Exitoso",
      description: "Refiere un chofer que complete 10 cargas",
      icon: <Gift className="w-5 h-5" />,
      current: 1,
      target: 1,
      bonus: 300,
      status: "earned",
      color: "bg-green-100 text-green-800",
    },
  ];

  const totalPotentialBonus = bonusPrograms.reduce((sum, prog) => sum + prog.bonus, 0);
  const earnedBonus = bonusPrograms.filter(p => p.status === "earned").reduce((sum, prog) => sum + prog.bonus, 0);

  return (
    <div className="space-y-6">
      {/* Bonus Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bonus Ganado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">${earnedBonus}</div>
            <p className="text-xs text-muted-foreground mt-1">Listo para cobrar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bonus Potencial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">${totalPotentialBonus}</div>
            <p className="text-xs text-muted-foreground mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proyección Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">$18,750</div>
            <p className="text-xs text-muted-foreground mt-1">Base + Bonus</p>
          </CardContent>
        </Card>
      </div>

      {/* Bonus Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Programas de Bonificación
          </CardTitle>
          <CardDescription>Gana dinero extra completando objetivos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bonusPrograms.map((program) => (
            <div key={program.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${program.color}`}>
                    {program.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{program.name}</h4>
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    program.status === "earned"
                      ? "default"
                      : program.status === "in_progress"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {program.status === "earned" && "✅ Ganado"}
                  {program.status === "in_progress" && "⏳ En Progreso"}
                  {program.status === "locked" && "🔒 Bloqueado"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {program.current} / {program.target}
                  </span>
                  <span className="font-semibold text-green-600">+${program.bonus}</span>
                </div>
                <Progress value={(program.current / program.target) * 100} className="h-2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bonus History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Bonus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { date: "25/03/2026", program: "Referido Exitoso", amount: 300, status: "Pagado" },
            { date: "15/03/2026", program: "Entregas Perfectas", amount: 150, status: "Pagado" },
            { date: "01/03/2026", program: "Calificación 5 Estrellas", amount: 200, status: "Pagado" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{item.program}</p>
                <p className="text-sm text-muted-foreground">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">+${item.amount}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">💡 Consejos para Maximizar Bonus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-amber-900 text-sm">
          <p>✓ Completa 2 entregas más para ganar $150 extra por entregas a tiempo</p>
          <p>✓ Mantén tu calificación en 4.9+ para ganar $200 adicionales</p>
          <p>✓ Recorre 750 millas más este mes para ganar $250 de bonus</p>
          <p>✓ Refiere otro chofer y gana $300 cuando complete 10 cargas</p>
        </CardContent>
      </Card>
    </div>
  );
}
