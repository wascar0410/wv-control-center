/**
 * NewLoad.tsx — WV Control Center
 * Formulario para crear una nueva carga con todos los campos requeridos.
 * Ruta: /loads/new
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Weight,
  Truck,
  FileText,
  Fuel,
  Receipt,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// ─── Field Group ──────────────────────────────────────────────────────────────
function FieldGroup({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function FormField({ label, required, children, hint }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Merchandise types ────────────────────────────────────────────────────────
const MERCHANDISE_TYPES = [
  "General Cargo",
  "Electronics",
  "Furniture",
  "Clothing / Apparel",
  "Food & Beverage",
  "Medical Supplies",
  "Auto Parts",
  "Construction Materials",
  "Fragile / Glassware",
  "Hazardous Materials",
  "Documents / Packages",
  "Other",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewLoad() {
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [form, setForm] = useState({
    clientName: "",
    pickupAddress: "",
    deliveryAddress: "",
    weight: "",
    weightUnit: "lbs",
    merchandiseType: "",
    price: "",
    estimatedFuel: "",
    estimatedTolls: "",
    assignedDriverId: "",
    notes: "",
    pickupDate: "",
    deliveryDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutations & queries
  const createLoadMutation = trpc.loads.create.useMutation();
  const { data: drivers } = trpc.assignment.drivers.useQuery(undefined, {
    retry: false,
  });
  const safeDrivers: any[] = Array.isArray(drivers) ? drivers : [];

  // Field update helper
  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.clientName.trim()) newErrors.clientName = "El nombre del cliente es requerido";
    if (!form.pickupAddress.trim()) newErrors.pickupAddress = "La dirección de recogida es requerida";
    if (!form.deliveryAddress.trim()) newErrors.deliveryAddress = "La dirección de entrega es requerida";
    if (!form.merchandiseType) newErrors.merchandiseType = "Selecciona el tipo de mercancía";
    if (!form.weight || Number(form.weight) <= 0) newErrors.weight = "El peso debe ser mayor a 0";
    if (!form.price || Number(form.price) <= 0) newErrors.price = "El precio debe ser mayor a 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createLoadMutation.mutateAsync({
        clientName: form.clientName.trim(),
        pickupAddress: form.pickupAddress.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        weight: Number(form.weight),
        weightUnit: form.weightUnit,
        merchandiseType: form.merchandiseType,
        price: Number(form.price),
        estimatedFuel: Number(form.estimatedFuel || 0),
        estimatedTolls: Number(form.estimatedTolls || 0),
        assignedDriverId: form.assignedDriverId ? Number(form.assignedDriverId) : undefined,
        notes: form.notes.trim() || undefined,
        pickupDate: form.pickupDate || undefined,
        deliveryDate: form.deliveryDate || undefined,
      });

      setSubmitted(true);
      toast.success("Carga creada exitosamente");

      // Navigate to the new load detail after a brief delay
      setTimeout(() => {
        setLocation(`/loads/${result.id}`);
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Error al crear la carga");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">¡Carga creada exitosamente!</p>
          <p className="text-sm text-muted-foreground mt-1">Redirigiendo al detalle de la carga...</p>
        </div>
      </div>
    );
  }

  // Estimated margin preview
  const price = Number(form.price || 0);
  const fuel = Number(form.estimatedFuel || 0);
  const tolls = Number(form.estimatedTolls || 0);
  const margin = price - fuel - tolls;
  const marginPct = price > 0 ? ((margin / price) * 100).toFixed(1) : "0.0";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/loads")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Carga</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Completa los campos para registrar una nueva carga</p>
        </div>
      </div>

      {/* Client Info */}
      <FieldGroup title="Información del Cliente" icon={User}>
        <FormField label="Nombre del cliente / broker" required>
          <Input
            placeholder="Ej: Amazon Logistics, XPO Freight..."
            value={form.clientName}
            onChange={(e) => update("clientName", e.target.value)}
            className={errors.clientName ? "border-red-500" : ""}
          />
          {errors.clientName && <p className="text-xs text-red-400 mt-1">{errors.clientName}</p>}
        </FormField>
      </FieldGroup>

      {/* Route */}
      <FieldGroup title="Ruta de Transporte" icon={MapPin}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Dirección de recogida (Pickup)" required>
            <Input
              placeholder="Ej: 123 Main St, Atlanta, GA 30301"
              value={form.pickupAddress}
              onChange={(e) => update("pickupAddress", e.target.value)}
              className={errors.pickupAddress ? "border-red-500" : ""}
            />
            {errors.pickupAddress && <p className="text-xs text-red-400 mt-1">{errors.pickupAddress}</p>}
          </FormField>

          <FormField label="Dirección de entrega (Delivery)" required>
            <Input
              placeholder="Ej: 456 Oak Ave, Charlotte, NC 28201"
              value={form.deliveryAddress}
              onChange={(e) => update("deliveryAddress", e.target.value)}
              className={errors.deliveryAddress ? "border-red-500" : ""}
            />
            {errors.deliveryAddress && <p className="text-xs text-red-400 mt-1">{errors.deliveryAddress}</p>}
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fecha de recogida">
            <Input
              type="date"
              value={form.pickupDate}
              onChange={(e) => update("pickupDate", e.target.value)}
            />
          </FormField>

          <FormField label="Fecha de entrega estimada">
            <Input
              type="date"
              value={form.deliveryDate}
              onChange={(e) => update("deliveryDate", e.target.value)}
            />
          </FormField>
        </div>
      </FieldGroup>

      {/* Cargo Details */}
      <FieldGroup title="Detalles de la Mercancía" icon={Package}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo de mercancía" required>
            <Select value={form.merchandiseType} onValueChange={(v) => update("merchandiseType", v)}>
              <SelectTrigger className={errors.merchandiseType ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {MERCHANDISE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.merchandiseType && <p className="text-xs text-red-400 mt-1">{errors.merchandiseType}</p>}
          </FormField>

          <FormField label="Peso" required>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Ej: 500"
                value={form.weight}
                onChange={(e) => update("weight", e.target.value)}
                className={`flex-1 ${errors.weight ? "border-red-500" : ""}`}
              />
              <Select value={form.weightUnit} onValueChange={(v) => update("weightUnit", v)}>
                <SelectTrigger className="w-20 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.weight && <p className="text-xs text-red-400 mt-1">{errors.weight}</p>}
          </FormField>
        </div>
      </FieldGroup>

      {/* Financials */}
      <FieldGroup title="Información Financiera" icon={DollarSign}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Precio acordado ($)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className={`pl-7 ${errors.price ? "border-red-500" : ""}`}
              />
            </div>
            {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
          </FormField>

          <FormField label="Combustible estimado ($)" hint="Costo estimado de gasolina">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.estimatedFuel}
                onChange={(e) => update("estimatedFuel", e.target.value)}
                className="pl-7"
              />
            </div>
          </FormField>

          <FormField label="Peajes estimados ($)" hint="Costo estimado de tolls">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.estimatedTolls}
                onChange={(e) => update("estimatedTolls", e.target.value)}
                className="pl-7"
              />
            </div>
          </FormField>
        </div>

        {/* Margin preview */}
        {price > 0 && (
          <div className={`flex items-center justify-between rounded-lg border p-3 ${
            margin >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
          }`}>
            <span className="text-xs font-medium text-muted-foreground">Margen neto estimado</span>
            <div className="text-right">
              <span className={`text-sm font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${margin.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">({marginPct}%)</span>
            </div>
          </div>
        )}
      </FieldGroup>

      {/* Driver Assignment */}
      <FieldGroup title="Asignación de Conductor" icon={Truck}>
        <FormField label="Conductor" hint="Opcional — puedes asignar el conductor después">
          <Select
            value={form.assignedDriverId || "none"}
            onValueChange={(v) => update("assignedDriverId", v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar (asignar después)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {safeDrivers.map((driver: any) => (
                <SelectItem key={driver.id} value={String(driver.id)}>
                  {driver.name || driver.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {safeDrivers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay conductores registrados. Puedes agregar conductores en la sección de Conductores.
          </p>
        )}
      </FieldGroup>

      {/* Notes */}
      <FieldGroup title="Notas e Instrucciones" icon={FileText}>
        <FormField label="Instrucciones especiales" hint="Opcional — instrucciones de entrega, acceso, contacto, etc.">
          <Textarea
            placeholder="Ej: Llamar al receptor antes de llegar. Acceso por puerta trasera. Requiere liftgate."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="resize-none"
          />
        </FormField>
      </FieldGroup>

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation("/loads")}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2 min-w-[140px]">
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creando carga...</>
          ) : (
            <><Package className="h-4 w-4" /> Crear Carga</>
          )}
        </Button>
      </div>
    </form>
  );
}
