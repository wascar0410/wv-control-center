import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Truck, Package, DollarSign, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import AddressInput from "./AddressInput";
import { trpc } from "@/lib/trpc";

interface QuotationFormProps {
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
}

export interface QuotationFormData {
  // Routing & calculation fields
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
  ratePerMile?: number;
  ratePerPound?: number;
  fuelSurcharge: number;
  offeredPrice?: number;
  includeReturnEmpty: boolean;
  // Load creation fields
  clientName: string;
  merchandiseType: string;
  pickupDate?: string;
  deliveryDate?: string;
  assignedDriverId?: number;
  notes?: string;
}

export default function QuotationForm({
  onSubmit,
  isLoading = false,
}: QuotationFormProps) {
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
    ratePerPound: undefined,
    fuelSurcharge: 0,
    offeredPrice: undefined,
    includeReturnEmpty: false,
    clientName: "",
    merchandiseType: "",
    pickupDate: "",
    deliveryDate: "",
    assignedDriverId: undefined,
    notes: "",
  });

  const { data: drivers } = trpc.assignment.drivers.useQuery();

  const handleInputChange = (
    field: keyof QuotationFormData,
    value: string | number | boolean | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const parseOptionalNumber = (value: string): number | undefined => {
    if (value.trim() === "") return undefined;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const parseRequiredNumber = (value: string): number => {
    if (value.trim() === "") return 0;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    if (!formData.merchandiseType.trim()) {
      toast.error("El tipo de mercancía es requerido");
      return;
    }

    if (
      !formData.vanAddress ||
      !formData.pickupAddress ||
      !formData.deliveryAddress
    ) {
      toast.error("Por favor completa todas las direcciones");
      return;
    }

    if (!formData.weight || formData.weight <= 0) {
      toast.error("⚠️ El peso de la carga es requerido. Ingresa un valor mayor a 0.");
      setTimeout(() => document.getElementById('weight')?.focus(), 100);
      return;
    }

    const hasVanCoords = Number.isFinite(formData.vanLat) && formData.vanLat !== 0 && Number.isFinite(formData.vanLng) && formData.vanLng !== 0;
    const hasPickupCoords = Number.isFinite(formData.pickupLat) && formData.pickupLat !== 0 && Number.isFinite(formData.pickupLng) && formData.pickupLng !== 0;
    const hasDeliveryCoords = Number.isFinite(formData.deliveryLat) && formData.deliveryLat !== 0 && Number.isFinite(formData.deliveryLng) && formData.deliveryLng !== 0;

    if (!hasVanCoords || !hasPickupCoords || !hasDeliveryCoords) {
      const missing = [];
      if (!hasVanCoords) missing.push('Van');
      if (!hasPickupCoords) missing.push('Recogida');
      if (!hasDeliveryCoords) missing.push('Entrega');
      toast.error(`⚠️ Faltan coordenadas para: ${missing.join(', ')}. Escribe la dirección y presiona Enter.`);
      return;
    }

    if (formData.offeredPrice !== undefined && formData.offeredPrice < 0) {
      toast.error("El precio no puede ser negativo");
      return;
    }

    const payload: QuotationFormData = {
      ...formData,
      offeredPrice: formData.offeredPrice || undefined,
      ratePerMile: formData.ratePerMile || undefined,
      ratePerPound: formData.ratePerPound || undefined,
      pickupDate: formData.pickupDate || undefined,
      deliveryDate: formData.deliveryDate || undefined,
      notes: formData.notes || undefined,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Información del Cliente ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del Cliente
          </CardTitle>
          <CardDescription>
            Datos del cliente y tipo de mercancía
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="clientName">
                Nombre del Cliente <span className="text-red-500 text-xs">*requerido</span>
              </Label>
              <Input
                id="clientName"
                placeholder="Ej: ABC Logistics"
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="merchandiseType">
                Tipo de Mercancía <span className="text-red-500 text-xs">*requerido</span>
              </Label>
              <Input
                id="merchandiseType"
                placeholder="Ej: Electrónica, Alimentos"
                value={formData.merchandiseType}
                onChange={(e) => handleInputChange("merchandiseType", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="assignedDriverId">Asignar Conductor (opcional)</Label>
              <select
                id="assignedDriverId"
                value={formData.assignedDriverId ?? ""}
                onChange={(e) =>
                  handleInputChange(
                    "assignedDriverId",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {Array.isArray(drivers) && drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.username || `Driver #${d.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pickupDate" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha de Recogida
              </Label>
              <Input
                id="pickupDate"
                type="date"
                value={formData.pickupDate ?? ""}
                onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha de Entrega
              </Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate ?? ""}
                onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas / Instrucciones Especiales</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Requiere liftgate, entrega con cita, temperatura controlada..."
              value={formData.notes ?? ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Ubicación de la Van ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Ubicación de la Van
          </CardTitle>
          <CardDescription>
            Dónde está actualmente la van de carga
          </CardDescription>
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

      {/* ── Punto de Recogida ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-500" />
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

      {/* ── Punto de Entrega ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
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
            onAddressChange={(addr) =>
              handleInputChange("deliveryAddress", addr)
            }
            onCoordinatesChange={(lat, lng) => {
              handleInputChange("deliveryLat", lat);
              handleInputChange("deliveryLng", lng);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Detalles de la Carga ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles de la Carga
          </CardTitle>
          <CardDescription>
            Información sobre el peso y descripción de la mercancía
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Peso <span className="text-red-500 text-xs">*requerido</span></Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="5000"
                value={formData.weight || ""}
                onChange={(e) =>
                  handleInputChange("weight", parseRequiredNumber(e.target.value))
                }
                className={`mt-1 ${!formData.weight ? 'border-amber-400' : 'border-green-400'}`}
              />
            </div>

            <div>
              <Label htmlFor="weightUnit">Unidad</Label>
              <select
                id="weightUnit"
                value={formData.weightUnit}
                onChange={(e) => handleInputChange("weightUnit", e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
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
              onChange={(e) =>
                handleInputChange("cargoDescription", e.target.value)
              }
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tarificación ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tarificación
          </CardTitle>
          <CardDescription>
            Puedes dejar el precio vacío para que el sistema calcule una
            recomendación automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="offeredPrice">Precio Ofrecido por el Broker ($)</Label>
            <Input
              id="offeredPrice"
              type="number"
              step="0.01"
              placeholder="425.00"
              value={formData.offeredPrice ?? ""}
              onChange={(e) =>
                handleInputChange(
                  "offeredPrice",
                  parseOptionalNumber(e.target.value)
                )
              }
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Opcional. Si lo dejas vacío, el sistema calcula el precio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ratePerMile">Tarifa por Milla ($)</Label>
              <Input
                id="ratePerMile"
                type="number"
                step="0.01"
                placeholder="2.50"
                value={formData.ratePerMile ?? ""}
                onChange={(e) =>
                  handleInputChange(
                    "ratePerMile",
                    parseOptionalNumber(e.target.value)
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ratePerPound">Tarifa por Libra ($)</Label>
              <Input
                id="ratePerPound"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.ratePerPound ?? ""}
                onChange={(e) =>
                  handleInputChange(
                    "ratePerPound",
                    parseOptionalNumber(e.target.value)
                  )
                }
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
              onChange={(e) =>
                handleInputChange(
                  "fuelSurcharge",
                  parseRequiredNumber(e.target.value)
                )
              }
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="includeReturnEmpty"
              checked={formData.includeReturnEmpty}
              onCheckedChange={(checked) =>
                handleInputChange("includeReturnEmpty", checked === true)
              }
            />
            <Label htmlFor="includeReturnEmpty" className="cursor-pointer">
              Incluir millas de retorno vacío
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? "Calculando..." : "Calcular Rentabilidad →"}
      </Button>
    </form>
  );
}
