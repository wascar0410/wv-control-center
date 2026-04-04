import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import {
  CheckCircle2, AlertCircle, Loader2, Eye, EyeOff,
  Truck, DollarSign, Hash, Info, User, Phone, Mail, Lock
} from "lucide-react";

interface AddDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ─── Payment formula logic ─────────────────────────────────────────────────────
// WITH DOT: Driver uses their own authority. Company charges a % commission on gross.
//   Net to driver = Gross load price × (1 - commissionPercent/100) - tolls - fuel
// WITHOUT DOT: Driver works under company authority. Company pays driver a fixed % of gross.
//   Net to driver = Gross load price × (commissionPercent/100)
//   (tolls and fuel are company expense)
function getPaymentFormula(hasDot: boolean, commission: number) {
  if (hasDot) {
    const keep = (100 - commission).toFixed(0);
    return {
      label: "Con DOT propio",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      badgeColor: "bg-blue-100 text-blue-700",
      description: `El chofer opera bajo su propia autoridad DOT.`,
      formula: `Pago neto = Precio del load × ${keep}% − Peajes − Combustible`,
      example: `Ej: Load de $1,000 → Chofer recibe $${(1000 * (100 - commission) / 100).toFixed(0)} (antes de peajes/combustible)`,
      companyKeeps: `Empresa retiene: ${commission}% de comisión`,
    };
  } else {
    return {
      label: "Sin DOT (bajo autoridad WV)",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      badgeColor: "bg-amber-100 text-amber-700",
      description: `El chofer opera bajo la autoridad de WV Transport & Logistics.`,
      formula: `Pago neto = Precio del load × ${commission}%`,
      example: `Ej: Load de $1,000 → Chofer recibe $${(1000 * commission / 100).toFixed(0)} (peajes y combustible son gasto de la empresa)`,
      companyKeeps: `Empresa retiene: ${(100 - commission)}% del gross`,
    };
  }
}

export function AddDriverModal({ open, onOpenChange, onSuccess }: AddDriverModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dotNumber: "",
    vehicleInfo: "",
    fleetType: "internal" as "internal" | "leased" | "external",
    commissionPercent: 20,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const utils = trpc.useUtils();
  const emailValidation = useEmailValidation(500);
  const passwordValidation = usePasswordValidation();

  const hasDot = formData.dotNumber.trim().length > 0;
  const formula = getPaymentFormula(hasDot, formData.commissionPercent);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      emailValidation.setEmail(value);
    } else if (name === "password") {
      passwordValidation.setPassword(value);
    } else if (name === "confirmPassword") {
      passwordValidation.setConfirmPassword(value);
    } else if (name === "commissionPercent") {
      setFormData(prev => ({ ...prev, commissionPercent: Math.min(100, Math.max(0, Number(value) || 0)) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const createDriverMutation = trpc.admin.createDriver.useMutation({
    onSuccess: (data) => {
      toast.success(`Chofer ${data.driver.name} creado exitosamente`);
      setFormData({ name: "", phone: "", dotNumber: "", vehicleInfo: "", fleetType: "internal", commissionPercent: 20 });
      emailValidation.setEmail("");
      passwordValidation.setPassword("");
      passwordValidation.setConfirmPassword("");
      onOpenChange(false);
      utils.admin.getDrivers.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear chofer");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !emailValidation.email || !passwordValidation.password) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    if (!emailValidation.isAvailable) {
      toast.error("Por favor verifica que el email sea válido y esté disponible");
      return;
    }
    if (!passwordValidation.isValid) {
      toast.error("Por favor verifica que las contraseñas sean válidas y coincidan");
      return;
    }

    createDriverMutation.mutate({
      name: formData.name,
      email: emailValidation.email,
      password: passwordValidation.password,
      phoneNumber: formData.phone || undefined,
      dotNumber: formData.dotNumber || undefined,
      vehicleInfo: formData.vehicleInfo || undefined,
      fleetType: formData.fleetType,
      commissionPercent: formData.commissionPercent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-primary" />
            Agregar Nuevo Chofer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Personal Info ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Información Personal
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" name="name" placeholder="Ej: Juan Pérez" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</Label>
                <Input id="phone" name="phone" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</Label>
              <div className="relative">
                <Input
                  id="email" name="email" type="email" placeholder="chofer@example.com"
                  value={emailValidation.email} onChange={handleInputChange} required
                  className={emailValidation.email ? (emailValidation.isAvailable ? "pr-10 border-green-400" : "pr-10 border-red-400") : ""}
                />
                {emailValidation.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValidation.isChecking ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      : emailValidation.isAvailable ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                )}
              </div>
              {emailValidation.error && <p className="text-xs text-red-500">{emailValidation.error}</p>}
              {emailValidation.isAvailable && emailValidation.email && !emailValidation.error && (
                <p className="text-xs text-green-600">✓ Email disponible</p>
              )}
            </div>
          </div>

          {/* ── DOT & Fleet ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Autoridad y Flota
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dotNumber" className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Número DOT
                  <span className="text-xs text-muted-foreground ml-1">(dejar vacío si no tiene)</span>
                </Label>
                <Input id="dotNumber" name="dotNumber" placeholder="Ej: 1234567" value={formData.dotNumber} onChange={handleInputChange} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Flota</Label>
                <Select value={formData.fleetType} onValueChange={(v) => setFormData(prev => ({ ...prev, fleetType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interno (empleado)</SelectItem>
                    <SelectItem value="leased">Arrendado (lease)</SelectItem>
                    <SelectItem value="external">Externo (contratista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicleInfo">Información del Vehículo</Label>
              <Input id="vehicleInfo" name="vehicleInfo" placeholder="Ej: 2022 Ford Transit Cargo Van - Placa ABC123" value={formData.vehicleInfo} onChange={handleInputChange} />
            </div>
          </div>

          {/* ── Commission & Payment Formula ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Comisión y Fórmula de Pago
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="commissionPercent">
                {hasDot ? "Comisión de la empresa (%)" : "Porcentaje al chofer (%)"}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="commissionPercent" name="commissionPercent" type="number"
                  min={0} max={100} step={1}
                  value={formData.commissionPercent}
                  onChange={handleInputChange}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {hasDot
                    ? `La empresa retiene ${formData.commissionPercent}% del gross`
                    : `El chofer recibe ${formData.commissionPercent}% del gross`}
                </span>
              </div>
            </div>

            {/* Formula preview card */}
            <div className={`rounded-lg border p-3 text-sm space-y-1.5 ${formula.color}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {formula.label}
                </span>
                <Badge className={`text-xs ${formula.badgeColor} border-0`}>
                  {hasDot ? "DOT propio" : "Sin DOT"}
                </Badge>
              </div>
              <p className="text-xs opacity-80">{formula.description}</p>
              <div className="font-mono text-xs bg-white/60 rounded px-2 py-1 border border-current/20">
                {formula.formula}
              </div>
              <p className="text-xs opacity-75">{formula.example}</p>
              <p className="text-xs font-medium">{formula.companyKeeps}</p>
            </div>
          </div>

          {/* ── Password ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Contraseña de Acceso
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password" name="password" type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres" value={passwordValidation.password}
                    onChange={handleInputChange} required className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordValidation.password && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${
                        passwordValidation.strength === "strong" ? "bg-green-500 w-full"
                        : passwordValidation.strength === "good" ? "bg-blue-500 w-3/4"
                        : passwordValidation.strength === "fair" ? "bg-yellow-500 w-1/2"
                        : "bg-red-500 w-1/4"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {passwordValidation.strength === "strong" ? "Fuerte"
                        : passwordValidation.strength === "good" ? "Buena"
                        : passwordValidation.strength === "fair" ? "Regular" : "Débil"}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword" name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={passwordValidation.confirmPassword}
                    onChange={handleInputChange} required
                    className={`pr-10 ${passwordValidation.confirmPassword
                      ? passwordValidation.isMatching ? "border-green-400" : "border-red-400"
                      : ""}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordValidation.confirmPassword && (
                  <p className={`text-xs ${passwordValidation.isMatching ? "text-green-600" : "text-red-500"}`}>
                    {passwordValidation.isMatching ? "✓ Coinciden" : "✗ No coinciden"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createDriverMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createDriverMutation.isPending || !emailValidation.isAvailable || emailValidation.isChecking || !passwordValidation.isValid}
              className="min-w-[120px]"
            >
              {createDriverMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
              ) : (
                <><Truck className="w-4 h-4 mr-2" /> Crear Chofer</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
