import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">WV Transport Control</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Transporte con cargo van, logística eficiente y control total de operaciones.
        </p>

        <div className="flex gap-4">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            Ir al Panel
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              window.open(
                "https://wa.me/19739558328?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20servicios%20de%20transporte",
                "_blank"
              )
            }
          >
            WhatsApp
          </Button>
        </div>

        <div className="mt-12 rounded-xl border border-border p-6">
          <h2 className="text-2xl font-semibold mb-3">Prueba estable 3</h2>
          <p className="text-muted-foreground">
            Si esta página no rebota y el botón entra al dashboard temporal,wascar
            el problema estaba en el layout/auth/páginas originales.
          </p>
        </div>
      </div>
    </div>
  );
}
