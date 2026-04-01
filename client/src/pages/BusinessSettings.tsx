import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BusinessSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Negocio</h1>
        <p className="text-muted-foreground">
          Vista segura de configuración mientras se restaura el backend completo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Costos Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Combustible: $3.60/gal</p>
          <p>Rendimiento van: 18 mpg</p>
          <p>Mantenimiento: $0.12/mi</p>
          <p>Llantas: $0.03/mi</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Fijos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Seguro: $450/mes</p>
          <p>Teléfono/Internet: $70/mes</p>
          <p>Apps: $45/mes</p>
          <p>Software contable: $30/mes</p>
          <p>Otros: $80/mes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Meta de millas: 4000/mes</p>
          <p>Ganancia mínima: $1.50/mi</p>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Configuración guardada (modo demo)")}>
        Guardar Cambios
      </Button>
    </div>
  );
}
