import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.driverLogin.useMutation({
    onSuccess: (data) => {
      // Also store in localStorage as backup
      localStorage.setItem("wv_token", data.token);
      localStorage.setItem("wv_user_role", data.role);
      localStorage.setItem("wv_user_email", data.email);

      toast.success(`¡Bienvenido, ${data.name}!`);

      // Redirect based on role
      if (data.role === "owner" || data.role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/driver");
      }
    },
    onError: (err) => {
      const msg = err.message || "Error al iniciar sesión";
      setError(msg);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ email: email.trim(), password });
    } catch {
      // handled in onError
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)`,
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">WV Control Center</span>
          </div>
          <p className="text-slate-400 text-sm">WV Transport & Logistics, LLC</p>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight">
              Gestiona tu flota<br />desde cualquier lugar
            </h2>
            <p className="text-slate-400 mt-3 text-base leading-relaxed">
              Panel de control completo para cargas, conductores, finanzas y seguimiento en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Cargas activas", value: "En vivo" },
              { label: "GPS Multi-Track", value: "Tiempo real" },
              { label: "Finanzas", value: "Integradas" },
              { label: "Conductores", value: "Gestionados" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-blue-400 text-xs font-medium uppercase tracking-wide">{item.value}</p>
                <p className="text-white text-sm font-medium mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-500 text-xs">© 2026 WV Transport & Logistics, LLC. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">WV Control Center</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 h-11"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 pr-10 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-muted-foreground text-center">
              <strong className="text-foreground">¿No tienes contraseña?</strong><br />
              Contacta al administrador para que configure tu acceso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
