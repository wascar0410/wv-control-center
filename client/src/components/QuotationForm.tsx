import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Truck, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface QuotationFormProps {
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
}

export interface QuotationFormData {
  vanLat: number;
  vanLng: number;
  vanAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  weight: number;
  weightUnit: string;
  cargoDescription: string;
  ratePerMile: number;
  ratePerPound?: number;
  fuelSurcharge: number;
  includeReturnEmpty: boolean;
}

export default function QuotationForm({ onSubmit, isLoading = false }: QuotationFormProps) {
  const [formData, setFormData] = useState<QuotationFormData>({
    vanLat: 0,
    vanLng: 0,
    vanAddress: "",
    pickupLat: 0,
    pickupLng: 0,
    pickupAddress: "",
    deliveryLat: 0,
    deliveryLng: 0,
    deliveryAddress: "",
    weight: 0,
    weightUnit: "lbs",
    cargoDescription: "",
    ratePerMile: 2.5,
    ratePerPound: 0,
    fuelSurcharge: 0,
    includeReturnEmpty: false,
  });

  const handleInputChange = (field: keyof QuotationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.vanAddress || !formData.pickupAddress || !formData.deliveryAddress) {
      toast.error("Por favor completa todas las direcciones");
      return;
    }

    if (formData.weight <= 0) {
      toast.error("El peso debe ser mayor a 0");
      return;
    }

    if (formData.ratePerMile <= 0) {
      toast.error("La tarifa por milla debe ser mayor a 0");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Van Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Ubicación de la Van
          </CardTitle>
          <CardDescription>Dónde está actualmente la van de carga</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vanAddress">Dirección de la Van</Label>
            <Input
              id="vanAddress"
              placeholder="Ej: 123 Main St, Miami, FL 33101"
              value={formData.vanAddress}
              onChange={(e) => handleInputChange("vanAddress", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vanLat">Latitud</Label>
              <Input
                id="vanLat"
                type="number"
                step="0.0001"
                placeholder="25.7617"
                value={formData.vanLat || ""}
                onChange={(e) => handleInputChange("vanLat", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vanLng">Longitud</Label>
              <Input
                id="vanLng"
                type="number"
                step="0.0001"
                placeholder="-80.1918"
                value={formData.vanLng || ""}
                onChange={(e) => handleInputChange("vanLng", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Punto de Recogida
          </CardTitle>
          <CardDescription>Dónde se recoge la carga</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pickupAddress">Dirección de Recogida</Label>
            <Input
              id="pickupAddress"
              placeholder="Ej: 456 Oak Ave, Tampa, FL 33602"
              value={formData.pickupAddress}
              onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupLat">Latitud</Label>
              <Input
                id="pickupLat"
                type="number"
                step="0.0001"
                placeholder="27.9506"
                value={formData.pickupLat || ""}
                onChange={(e) => handleInputChange("pickupLat", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pickupLng">Longitud</Label>
              <Input
                id="pickupLng"
                type="number"
                step="0.0001"
                placeholder="-82.4572"
                value={formData.pickupLng || ""}
                onChange={(e) => handleInputChange("pickupLng", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Punto de Entrega
          </CardTitle>
          <CardDescription>Dónde se entrega la carga</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="deliveryAddress">Dirección de Entrega</Label>
            <Input
              id="deliveryAddress"
              placeholder="Ej: 789 Pine Rd, Jacksonville, FL 32099"
              value={formData.deliveryAddress}
              onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryLat">Latitud</Label>
              <Input
                id="deliveryLat"
                type="number"
                step="0.0001"
                placeholder="30.3322"
                value={formData.deliveryLat || ""}
                onChange={(e) => handleInputChange("deliveryLat", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="deliveryLng">Longitud</Label>
              <Input
                id="deliveryLng"
                type="number"
                step="0.0001"
                placeholder="-81.6557"
                value={formData.deliveryLng || ""}
                onChange={(e) => handleInputChange("deliveryLng", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cargo Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles de la Carga
          </CardTitle>
          <CardDescription>Información sobre la carga a transportar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Peso</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="5000"
                value={formData.weight || ""}
                onChange={(e) => handleInputChange("weight", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="weightUnit">Unidad</Label>
              <select
                id="weightUnit"
                value={formData.weightUnit}
                onChange={(e) => handleInputChange("weightUnit", e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="lbs">Libras (lbs)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="tons">Toneladas</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="cargoDescription">Descripción de la Carga</Label>
            <Input
              id="cargoDescription"
              placeholder="Ej: Equipos electrónicos, maquinaria, etc."
              value={formData.cargoDescription}
              onChange={(e) => handleInputChange("cargoDescription", e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tarificación
          </CardTitle>
          <CardDescription>Configura las tarifas para esta carga</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ratePerMile">Tarifa por Milla ($)</Label>
              <Input
                id="ratePerMile"
                type="number"
                step="0.01"
                placeholder="2.50"
                value={formData.ratePerMile || ""}
                onChange={(e) => handleInputChange("ratePerMile", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ratePerPound">Tarifa por Libra ($) - Opcional</Label>
              <Input
                id="ratePerPound"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.ratePerPound || ""}
                onChange={(e) => handleInputChange("ratePerPound", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="fuelSurcharge">Recargo de Combustible ($)</Label>
            <Input
              id="fuelSurcharge"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.fuelSurcharge || ""}
              onChange={(e) => handleInputChange("fuelSurcharge", parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="includeReturnEmpty"
              checked={formData.includeReturnEmpty}
              onCheckedChange={(checked) => handleInputChange("includeReturnEmpty", checked)}
            />
            <Label htmlFor="includeReturnEmpty" className="cursor-pointer">
              Incluir millas de retorno vacío (van regresa al origen)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Calculando..." : "Calcular Cotización"}
      </Button>
    </form>
  );
}
