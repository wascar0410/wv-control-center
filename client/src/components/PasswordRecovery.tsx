import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

interface PasswordRecoveryProps {
  onBack: () => void;
}

export function PasswordRecovery({ onBack }: PasswordRecoveryProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Recovery email sent! Check your inbox.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send recovery email");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      await requestReset.mutateAsync({ email });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Recuperar Contraseña</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubmitted ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">Email enviado</p>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              El enlace expira en 24 horas. Si no ves el email, revisa tu carpeta de spam.
            </p>
            <Button onClick={onBack} className="w-full">
              Volver al Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa el email asociado a tu cuenta
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? "Enviando..." : "Enviar Enlace de Recuperación"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
            >
              Cancelar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
