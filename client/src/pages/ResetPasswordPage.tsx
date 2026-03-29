import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export function ResetPasswordPage() {
  const [location, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");

  const passwordValidation = usePasswordValidation();

  const validateToken = trpc.auth.validateResetToken.useQuery(
    { token },
    { enabled: !!token && tokenValid === null }
  );

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada exitosamente");
      setTimeout(() => navigate("/"), 2000);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar contraseña");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setTokenError("Token no encontrado");
      setTokenValid(false);
    }
  }, []);

  useEffect(() => {
    if (validateToken.data) {
      if (validateToken.data.valid) {
        setTokenValid(true);
        setTokenError("");
      } else {
        setTokenValid(false);
        setTokenError(validateToken.data.error || "Token inválido");
      }
    }
  }, [validateToken.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      toast.error("Por favor verifica que las contraseñas sean válidas y coincidan");
      return;
    }

    resetPassword.mutate({
      token,
      newPassword: passwordValidation.password,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    passwordValidation.setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    passwordValidation.setConfirmPassword(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="space-y-2">
            <CardTitle>Establecer Nueva Contraseña</CardTitle>
            <CardDescription>
              Crea una contraseña segura para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenValid === false ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="font-medium text-red-400">Error</p>
                </div>
                <p className="text-sm text-slate-300">{tokenError}</p>
                <Button
                  onClick={() => navigate("/forgot-password")}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Solicitar Nuevo Enlace
                </Button>
              </div>
            ) : tokenValid === null ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa una contraseña segura"
                      value={passwordValidation.password}
                      onChange={handlePasswordChange}
                      required
                      disabled={resetPassword.isPending}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
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
                        <span className="text-xs font-medium text-slate-400">
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
                        <ul className="text-xs text-red-400 space-y-1">
                          {passwordValidation.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirma tu contraseña"
                      value={passwordValidation.confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      required
                      disabled={resetPassword.isPending}
                      className={`bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10 ${
                        passwordValidation.confirmPassword &&
                        (passwordValidation.isMatching
                          ? "border-green-500"
                          : "border-red-500")
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {passwordValidation.confirmPassword && (
                    <div className="flex items-center gap-2">
                      {passwordValidation.isMatching ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <p className="text-sm text-green-400">Las contraseñas coinciden</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <p className="text-sm text-red-400">Las contraseñas no coinciden</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={resetPassword.isPending || !passwordValidation.isValid}
                >
                  {resetPassword.isPending ? "Actualizando..." : "Actualizar Contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
