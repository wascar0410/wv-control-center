import { MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPlaceholder() {
  return (
    <section className="space-y-6">
      {/* HEADER */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Chat con Choferes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comunicación en tiempo real para coordinación operativa y seguimiento de cargas.
            </p>
          </div>
        </div>
      </header>

      {/* COMING SOON PLACEHOLDER */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Chat en Desarrollo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              La funcionalidad de chat estará disponible pronto. Estamos trabajando para traerte una experiencia de comunicación mejorada con tus choferes.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
