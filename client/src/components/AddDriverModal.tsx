import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface AddDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDriverModal({ open, onOpenChange, onSuccess }: AddDriverModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const utils = trpc.useUtils();
  const emailValidation = useEmailValidation(500);
  const passwordValidation = usePasswordValidation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      emailValidation.setEmail(value);
    } else if (name === "password") {
      passwordValidation.setPassword(value);
    } else if (name === "confirmPassword") {
      passwordValidation.setConfirmPassword(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const createDriverMutation = trpc.admin.createDriver.useMutation({
    onSuccess: (data) => {
      toast.success(`Chofer ${data.driver.name} creado exitosamente`);
      setFormData({ name: "", phone: "" });
      emailValidation.setEmail("");
      onOpenChange(false);
      utils.driver.myLoads.invalidate();
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Chofer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Chofer *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Juan Pérez"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="chofer@example.com"
                value={emailValidation.email}
                onChange={handleInputChange}
                required
                className={emailValidation.email ? (emailValidation.isAvailable ? "pr-10" : "pr-10") : ""}
              />
              {emailValidation.email && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {emailValidation.isChecking ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : emailValidation.isAvailable ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {emailValidation.error && (
              <p className="text-sm text-red-500 mt-1">{emailValidation.error}</p>
            )}
            {emailValidation.isAvailable && emailValidation.email && !emailValidation.error && (
              <p className="text-sm text-green-500 mt-1">Email disponible</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (Opcional)</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa una contraseña segura"
                value={passwordValidation.password}
                onChange={handleInputChange}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {passwordValidation.password && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        passwordValidation.strength === "strong"
                          ? "bg-green-500"
                          : passwordValidation.strength === "good"
                          ? "bg-blue-500"
                          : passwordValidation.strength === "fair"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${passwordValidation.strengthScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {passwordValidation.strength === "strong"
                      ? "Fuerte"
                      : passwordValidation.strength === "good"
                      ? "Buena"
                      : passwordValidation.strength === "fair"
                      ? "Regular"
                      : "Débil"}
                  </span>
                </div>
                {passwordValidation.errors.length > 0 && (
                  <ul className="text-xs text-red-500 space-y-1">
                    {passwordValidation.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirma tu contraseña"
                value={passwordValidation.confirmPassword}
                onChange={handleInputChange}
                required
                className={`pr-10 ${
                  passwordValidation.confirmPassword && !passwordValidation.isMatching
                    ? "border-red-500"
                    : passwordValidation.confirmPassword && passwordValidation.isMatching
                    ? "border-green-500"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {passwordValidation.confirmPassword && (
              <p
                className={`text-sm ${
                  passwordValidation.isMatching ? "text-green-500" : "text-red-500"
                }`}
              >
                {passwordValidation.isMatching
                  ? "✓ Las contraseñas coinciden"
                  : "✗ Las contraseñas no coinciden"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createDriverMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createDriverMutation.isPending || !emailValidation.isAvailable || emailValidation.isChecking || !passwordValidation.isValid}
            >
              {createDriverMutation.isPending ? "Creando..." : "Crear Chofer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
