import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestPasswordReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setEmail("");
      toast.success("Si el email existe, recibirás un enlace de recuperación");
    },
    onError: (error) => {
      toast.error(error.message || "Error al solicitar recuperación de contraseña");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor ingresa tu email");
      return;
    }
    requestPasswordReset.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              <CardTitle>Recuperar Contraseña</CardTitle>
            </div>
            <CardDescription>
              Ingresa tu email para recibir un enlace de recuperación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={requestPasswordReset.isPending}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={requestPasswordReset.isPending}
                >
                  {requestPasswordReset.isPending ? "Enviando..." : "Enviar Enlace de Recuperación"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-400 font-medium">¡Listo!</p>
                  <p className="text-sm text-slate-300 mt-2">
                    Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña.
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  El enlace expirará en 24 horas por razones de seguridad.
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Intentar con otro email
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-700">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
