import { ChatWidget } from "@/components/ChatWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export function Chat() {
  return (
    <section className="space-y-6" aria-labelledby="chat-page-title">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h1 id="chat-page-title" className="text-2xl font-bold tracking-tight text-foreground">
              Chat con Choferes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comunicación en tiempo real con tu equipo de choferes para coordinar cargas, rutas y actualizaciones operativas.
            </p>
          </div>
        </div>
      </header>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Mensajes</CardTitle>
              <CardDescription>
                Conversaciones activas y seguimiento operativo del equipo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="min-h-[520px] overflow-hidden rounded-b-xl">
            <ChatWidget />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
