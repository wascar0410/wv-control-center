import { ChatWidget } from "@/components/ChatWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Chat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chat con Choferes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comunicación en tiempo real con tu equipo de choferes
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Mensajes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 min-h-[500px]">
          <ChatWidget />
        </CardContent>
      </Card>
    </div>
  );
}
