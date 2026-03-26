import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Stop {
  id?: string;
  type: "pickup" | "delivery";
  address: string;
  latitude: number;
  longitude: number;
  weight?: number;
  description?: string;
}

interface StopsListProps {
  stops: Stop[];
  onAddStop: (stop: Stop) => void;
  onRemoveStop: (index: number) => void;
  onUpdateStop: (index: number, stop: Stop) => void;
}

export default function StopsList({ stops, onAddStop, onRemoveStop, onUpdateStop }: StopsListProps) {
  const [newStop, setNewStop] = useState<Stop>({
    type: "pickup",
    address: "",
    latitude: 0,
    longitude: 0,
    weight: 0,
    description: "",
  });

  const handleAddStop = () => {
    if (!newStop.address || newStop.latitude === 0 || newStop.longitude === 0) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    onAddStop(newStop);
    setNewStop({
      type: "pickup",
      address: "",
      latitude: 0,
      longitude: 0,
      weight: 0,
      description: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Add New Stop */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nueva Parada</CardTitle>
          <CardDescription>Añade puntos de recogida o entrega a tu ruta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stopType">Tipo de Parada</Label>
              <Select value={newStop.type} onValueChange={(value) => setNewStop({ ...newStop, type: value as "pickup" | "delivery" })}>
                <SelectTrigger id="stopType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Recogida</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="weight">Peso (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="0"
                value={newStop.weight || 0}
                onChange={(e) => setNewStop({ ...newStop, weight: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Ej: 123 Main St, Miami, FL 33101"
              value={newStop.address}
              onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitud</Label>
              <Input
                id="latitude"
                type="number"
                placeholder="25.7617"
                step="0.0001"
                value={newStop.latitude || ""}
                onChange={(e) => setNewStop({ ...newStop, latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitud</Label>
              <Input
                id="longitude"
                type="number"
                placeholder="-80.1918"
                step="0.0001"
                value={newStop.longitude || ""}
                onChange={(e) => setNewStop({ ...newStop, longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Notas adicionales sobre esta parada"
              value={newStop.description || ""}
              onChange={(e) => setNewStop({ ...newStop, description: e.target.value })}
              rows={2}
            />
          </div>

          <Button onClick={handleAddStop} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Parada
          </Button>
        </CardContent>
      </Card>

      {/* Stops List */}
      {stops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Paradas ({stops.length})</CardTitle>
            <CardDescription>Arrastra para reordenar o elimina paradas innecesarias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={stop.type === "pickup" ? "default" : "secondary"}>
                        {stop.type === "pickup" ? "Recogida" : "Entrega"}
                      </Badge>
                      <span className="text-sm font-medium">Parada {index + 1}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{stop.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </p>
                    {stop.weight && <p className="text-xs text-muted-foreground">Peso: {stop.weight} lbs</p>}
                    {stop.description && <p className="text-xs text-muted-foreground italic">{stop.description}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveStop(index)}
                    className="flex-shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
