import { useMemo, useState } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Users, Wifi } from "lucide-react";

type ChatProps = {
  activeConversationsCount?: number;
  onlineDriversCount?: number;
};

export function Chat({
  activeConversationsCount = 0,
  onlineDriversCount = 0,
}: ChatProps) {
  const [search, setSearch] = useState("");

  const summary = useMemo(
    () => ({
      activeConversationsLabel:
        activeConversationsCount === 1
          ? "1 conversación activa"
          : `${activeConversationsCount} conversaciones activas`,
      onlineDriversLabel:
        onlineDriversCount === 1
          ? "1 chofer en línea"
          : `${onlineDriversCount} choferes en línea`,
    }),
    [activeConversationsCount, onlineDriversCount]
  );

  return (
    <section className="space-y-6" aria-labelledby="chat-page-title">
      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0">
            <h1
              id="chat-page-title"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Chat con Choferes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comunicación en tiempo real con tu equipo de choferes para coordinar
              cargas, rutas y actualizaciones operativas.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Conversaciones
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {summary.activeConversationsLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Wifi className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  En línea
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {summary.onlineDriversLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Enfoque
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Coordinación operativa
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Mensajes</CardTitle>
              <CardDescription>
                Conversaciones activas, seguimiento operativo y comunicación con choferes.
              </CardDescription>
            </div>

            <div className="w-full max-w-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar chofer o conversación..."
                  className="pl-9"
                  aria-label="Buscar chofer o conversación"
                />
              </div>
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
