/**
 * LoadDetail.tsx — WV Control Center
 * Página de detalle de carga. Muestra información completa según el estatus de la carga.
 * Accesible desde: Dashboard (cargas recientes), Loads (lista), BrokerLoadsManagement.
 * Ruta: /loads/:id
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  CreditCard,
  Weight,
  Hash,
  Phone,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ─── Status configuration ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  description: string;
  nextStep: string;
}> = {
  available: {
    label: "Disponible",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: Package,
    description: "Esta carga está disponible y esperando asignación de conductor.",
    nextStep: "Asignar conductor para iniciar el transporte.",
  },
  in_transit: {
    label: "En Tránsito",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: Truck,
    description: "La carga está siendo transportada actualmente.",
    nextStep: "Subir prueba de entrega (POD) al llegar al destino.",
  },
  delivered: {
    label: "Entregada",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    icon: CheckCircle2,
    description: "La carga fue entregada exitosamente.",
    nextStep: "Generar y enviar factura al broker/cliente.",
  },
  invoiced: {
    label: "Facturada",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: Receipt,
    description: "La factura fue enviada al cliente y está pendiente de pago.",
    nextStep: "Esperar confirmación de pago del cliente.",
  },
  paid: {
    label: "Pagada",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CreditCard,
    description: "El pago fue recibido. Carga completada.",
    nextStep: "Registrar el ingreso en el módulo de finanzas.",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? n : 0
  );
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-foreground break-words ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
const STATUS_ORDER = ["available", "in_transit", "delivered", "invoiced", "paid"];
const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  in_transit: "En Tránsito",
  delivered: "Entregada",
  invoiced: "Facturada",
  paid: "Pagada",
};

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STATUS_ORDER.map((status, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const cfg = STATUS_CONFIG[status];
        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                isCurrent
                  ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                  : isCompleted
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-muted/30 border-border text-muted-foreground"
              }`}>
                {isCompleted
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <cfg.icon className="h-3.5 w-3.5" />
                }
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${
                isCurrent ? cfg.color : isCompleted ? "text-primary" : "text-muted-foreground"
              }`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            {idx < STATUS_ORDER.length - 1 && (
              <div className={`h-0.5 w-6 shrink-0 mx-0.5 mb-4 ${
                idx < currentIdx ? "bg-primary/40" : "bg-border"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoadDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const loadId = Number(params.id);

  const { data: load, isLoading, error } = trpc.loads.byId.useQuery(
    { id: loadId },
    { enabled: !isNaN(loadId), retry: false }
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loads")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando detalle de carga...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not found state ────────────────────────────────────────────────
  if (error || !load) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loads")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Cargas
          </Button>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground mb-1">Carga no encontrada</p>
          <p className="text-xs text-muted-foreground">
            La carga #{loadId} no existe o no tienes acceso a ella.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setLocation("/loads")}>
            Ver todas las cargas
          </Button>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
  const StatusIcon = statusCfg.icon;

  const price = Number(load.price ?? 0);
  const fuel = Number(load.estimatedFuel ?? 0);
  const tolls = Number(load.estimatedTolls ?? 0);
  const netMargin = Number(load.netMargin ?? (price - fuel - tolls));
  const marginPct = price > 0 ? ((netMargin / price) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loads")} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{load.clientName}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carga #{load.id} · Creada {formatDateTime(load.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Timeline ── */}
      <Card className="p-4 bg-card border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Progreso de la Carga</p>
        <StatusTimeline currentStatus={load.status} />
        <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 ${statusCfg.bg} border ${statusCfg.border}`}>
          <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${statusCfg.color}`} />
          <div>
            <p className={`text-xs font-semibold ${statusCfg.color}`}>{statusCfg.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium">Próximo paso:</span> {statusCfg.nextStep}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Main Grid ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Route */}
        <SectionCard title="Ruta de Transporte" icon={MapPin}>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
                <div className="w-0.5 h-8 bg-border my-1" />
                <div className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Origen (Pickup)</p>
                  <p className="text-sm font-medium text-foreground">{load.pickupAddress}</p>
                  {load.pickupDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(load.pickupDate)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destino (Delivery)</p>
                  <p className="text-sm font-medium text-foreground">{load.deliveryAddress}</p>
                  {load.deliveryDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(load.deliveryDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {(load.pickupLat && load.pickupLng) && (
              <a
                href={`https://www.google.com/maps/dir/${load.pickupLat},${load.pickupLng}/${load.deliveryLat ?? ""},${load.deliveryLng ?? ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Ver ruta en Google Maps
              </a>
            )}
          </div>
        </SectionCard>

        {/* Financials */}
        <SectionCard title="Resumen Financiero" icon={DollarSign}>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Precio acordado</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Combustible estimado</span>
              <span className="text-sm text-red-400">−{formatCurrency(fuel)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Peajes estimados</span>
              <span className="text-sm text-red-400">−{formatCurrency(tolls)}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-muted/30 rounded-lg px-2 mt-1">
              <span className="text-xs font-semibold text-foreground">Margen neto estimado</span>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(netMargin)}</span>
                <span className="text-xs text-muted-foreground ml-1">({marginPct}%)</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Cargo Details */}
        <SectionCard title="Detalles de la Mercancía" icon={Package}>
          <InfoRow icon={Package} label="Tipo de mercancía" value={load.merchandiseType} />
          <InfoRow icon={Weight} label="Peso" value={`${Number(load.weight ?? 0).toLocaleString()} ${load.weightUnit ?? "lbs"}`} />
          <InfoRow icon={Hash} label="ID de carga" value={`#${load.id}`} mono />
          {load.bolImageUrl && (
            <div className="pt-2">
              <a
                href={load.bolImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                Ver Bill of Lading (BOL)
              </a>
            </div>
          )}
        </SectionCard>

        {/* Assignment & Driver */}
        <SectionCard title="Asignación" icon={User}>
          <InfoRow
            icon={User}
            label="Conductor asignado"
            value={load.assignedDriverId ? `Driver ID #${load.assignedDriverId}` : "Sin asignar"}
          />
          <InfoRow
            icon={Clock}
            label="Fecha de pickup"
            value={formatDate(load.pickupDate)}
          />
          <InfoRow
            icon={CheckCircle2}
            label="Fecha de entrega"
            value={formatDate(load.deliveryDate)}
          />
          <InfoRow
            icon={Calendar}
            label="Última actualización"
            value={formatDateTime(load.updatedAt)}
          />
        </SectionCard>
      </div>

      {/* Notes */}
      {load.notes && (
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Notas e Instrucciones</h3>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
            {load.notes}
          </p>
        </Card>
      )}

      {/* Status-specific action cards */}
      {load.status === "delivered" && (
        <Card className="p-5 bg-green-500/5 border-green-500/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-400 mb-1">Carga Entregada — Acción Requerida</p>
              <p className="text-xs text-muted-foreground mb-3">
                La carga fue entregada. El siguiente paso es generar y enviar la factura al cliente.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => setLocation("/accounting-finance")}>
                  <Receipt className="h-3.5 w-3.5" /> Ir a Facturación
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {load.status === "invoiced" && (
        <Card className="p-5 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-400 mb-1">Factura Enviada — Pendiente de Pago</p>
              <p className="text-xs text-muted-foreground mb-3">
                La factura fue enviada al cliente. Cuando recibas el pago, registra el ingreso en finanzas.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => setLocation("/transactions")}>
                  <DollarSign className="h-3.5 w-3.5" /> Registrar Pago
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {load.status === "paid" && (
        <Card className="p-5 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400 mb-1">Carga Completada y Pagada</p>
              <p className="text-xs text-muted-foreground">
                Esta carga está completamente cerrada. El ingreso de {formatCurrency(price)} fue recibido.
              </p>
            </div>
          </div>
        </Card>
      )}

      {load.status === "in_transit" && (
        <Card className="p-5 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-start gap-3">
            <Truck className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-400 mb-1">Carga en Tránsito</p>
              <p className="text-xs text-muted-foreground mb-3">
                El conductor está en camino. Al llegar al destino, sube la prueba de entrega (POD).
              </p>
            </div>
          </div>
        </Card>
      )}

      {load.status === "available" && (
        <Card className="p-5 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-400 mb-1">Carga Disponible — Sin Asignar</p>
              <p className="text-xs text-muted-foreground mb-3">
                Esta carga está lista para ser asignada a un conductor.
              </p>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                onClick={() => setLocation("/loads")}>
                <User className="h-3.5 w-3.5" /> Asignar Conductor
              </Button>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
