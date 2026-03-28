import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Truck, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";
import AddressInput from "./AddressInput";

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
  offeredPrice: number;
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
    offeredPrice: 0,
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

    if (formData.offeredPrice <= 0) {
      toast.error("El precio ofrecido debe ser mayor a 0");
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
          <AddressInput
            label="Dirección de la Van"
            placeholder="Ej: 123 Main St, Miami, FL 33101"
            value={formData.vanAddress}
            latitude={formData.vanLat}
            longitude={formData.vanLng}
            onAddressChange={(addr) => handleInputChange("vanAddress", addr)}
            onCoordinatesChange={(lat, lng) => {
              handleInputChange("vanLat", lat);
              handleInputChange("vanLng", lng);
            }}
          />
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
          <AddressInput
            label="Dirección de Recogida"
            placeholder="Ej: 456 Oak Ave, Tampa, FL 33602"
            value={formData.pickupAddress}
            latitude={formData.pickupLat}
            longitude={formData.pickupLng}
            onAddressChange={(addr) => handleInputChange("pickupAddress", addr)}
            onCoordinatesChange={(lat, lng) => {
              handleInputChange("pickupLat", lat);
              handleInputChange("pickupLng", lng);
            }}
          />
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
          <AddressInput
            label="Dirección de Entrega"
            placeholder="Ej: 789 Pine Rd, Jacksonville, FL 32099"
            value={formData.deliveryAddress}
            latitude={formData.deliveryLat}
            longitude={formData.deliveryLng}
            onAddressChange={(addr) => handleInputChange("deliveryAddress", addr)}
            onCoordinatesChange={(lat, lng) => {
              handleInputChange("deliveryLat", lat);
              handleInputChange("deliveryLng", lng);
            }}
          />
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
          <CardDescription>Configura el precio ofrecido por el broker</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="offeredPrice">Precio Ofrecido por el Broker ($) *</Label>
            <Input
              id="offeredPrice"
              type="number"
              step="0.01"
              placeholder="425.00"
              value={formData.offeredPrice || ""}
              onChange={(e) => handleInputChange("offeredPrice", parseFloat(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Este es el precio total que ofrece el broker por la carga</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ratePerMile">Tarifa por Milla ($) - Referencia</Label>
              <Input
                id="ratePerMile"
                type="number"
                step="0.01"
                placeholder="2.50"
                value={formData.ratePerMile || ""}
                onChange={(e) => handleInputChange("ratePerMile", parseFloat(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Para referencia</p>
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
