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
offeredPrice?: number;
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
offeredPrice: undefined,
includeReturnEmpty: false,
});

const handleInputChange = (field: keyof QuotationFormData, value: any) => {
setFormData((prev) => ({
...prev,
[field]: value,
}));
};

const safeNumber = (value: string) => {
if (!value || value.trim() === "") return 0;
const parsed = parseFloat(value);
return Number.isNaN(parsed) ? 0 : parsed;
};

const handleSubmit = (e: React.FormEvent) => {
e.preventDefault();

```
console.log("🚀 SUBMIT QUOTATION:", formData);

// VALIDACIONES
if (!formData.vanAddress || !formData.pickupAddress || !formData.deliveryAddress) {
  toast.error("Completa todas las direcciones");
  return;
}

if (formData.weight <= 0) {
  toast.error("El peso debe ser mayor a 0");
  return;
}

if (
  !formData.vanLat ||
  !formData.vanLng ||
  !formData.pickupLat ||
  !formData.pickupLng ||
  !formData.deliveryLat ||
  !formData.deliveryLng
) {
  toast.error("Faltan coordenadas. Selecciona direcciones válidas.");
  return;
}

// NORMALIZAR DATA
const payload = {
  ...formData,
  offeredPrice: formData.offeredPrice || undefined,
  ratePerPound: formData.ratePerPound || undefined,
};

console.log("📦 PAYLOAD FINAL:", payload);

onSubmit(payload);
```

};

return ( <form onSubmit={handleSubmit} className="space-y-6">

```
  {/* VAN */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Truck className="w-5 h-5" />
        Ubicación de la Van
      </CardTitle>
    </CardHeader>
    <CardContent>
      <AddressInput
        label="Dirección de la Van"
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

  {/* PICKUP */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Pickup
      </CardTitle>
    </CardHeader>
    <CardContent>
      <AddressInput
        label="Dirección de Recogida"
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

  {/* DELIVERY */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Delivery
      </CardTitle>
    </CardHeader>
    <CardContent>
      <AddressInput
        label="Dirección de Entrega"
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

  {/* CARGA */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Package className="w-5 h-5" />
        Carga
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Input
        placeholder="Peso"
        type="number"
        value={formData.weight || ""}
        onChange={(e) => handleInputChange("weight", safeNumber(e.target.value))}
      />
      <Input
        placeholder="Descripción"
        value={formData.cargoDescription}
        onChange={(e) => handleInputChange("cargoDescription", e.target.value)}
      />
    </CardContent>
  </Card>

  {/* PRICING */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Pricing
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Input
        placeholder="Precio ofrecido"
        type="number"
        value={formData.offeredPrice ?? ""}
        onChange={(e) =>
          handleInputChange(
            "offeredPrice",
            e.target.value === "" ? undefined : safeNumber(e.target.value)
          )
        }
      />
    </CardContent>
  </Card>

  <Button type="submit" className="w-full" disabled={isLoading}>
    {isLoading ? "Calculando..." : "Calcular Cotización"}
  </Button>
</form>
```

);
}
