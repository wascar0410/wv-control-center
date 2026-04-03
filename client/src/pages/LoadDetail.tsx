/**
 * LoadDetail.tsx — WV Control Center
 * Página de detalle de carga con:
 * - Cambio de estatus desde el detalle
 * - Subida de POD (Proof of Delivery) para cargas in_transit
 * - Información completa según el estatus
 * Ruta: /loads/:id
 */
import { useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  AlertCircle,
  Receipt,
  CreditCard,
  Weight,
  Hash,
  ExternalLink,
  Upload,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  X,
  Clock,
  Activity,
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
    nextStep: "Iniciar el transporte marcando como 'En Tránsito'.",
  },
  in_transit: {
    label: "En Tránsito",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: Truck,
    description: "La carga está siendo transportada actualmente.",
    nextStep: "Subir POD y marcar como 'Entregada' al llegar al destino.",
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
    nextStep: "Marcar como 'Pagada' cuando recibas el pago.",
  },
  paid: {
    label: "Pagada",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CreditCard,
    description: "El pago fue recibido. Carga completada.",
    nextStep: "Carga cerrada. El ingreso fue registrado automáticamente.",
  },
};

// Status transitions — what status can follow the current one
const STATUS_TRANSITIONS: Record<string, { label: string; value: string; icon: React.ElementType; color: string }[]> = {
  available: [
    { label: "Iniciar Transporte", value: "in_transit", icon: Truck, color: "text-amber-400" },
  ],
  in_transit: [
    { label: "Marcar como Entregada", value: "delivered", icon: CheckCircle2, color: "text-green-400" },
  ],
  delivered: [
    { label: "Marcar como Facturada", value: "invoiced", icon: Receipt, color: "text-purple-400" },
  ],
  invoiced: [
    { label: "Registrar Pago Recibido", value: "paid", icon: CreditCard, color: "text-emerald-400" },
  ],
  paid: [],
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
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

// ─── POD Upload Component ─────────────────────────────────────────────────────
function PODUpload({ loadId, onSuccess }: { loadId: number; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadBOLMutation = trpc.loads.uploadBOL.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máx. 10MB)");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(selectedFile);
      await uploadBOLMutation.mutateAsync({
        loadId,
        fileBase64: base64,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
      });
      toast.success("POD subido exitosamente");
      setPreview(null);
      setSelectedFile(null);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el POD");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all p-6 cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Seleccionar archivo POD</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP o PDF · Máx. 10MB</p>
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {selectedFile?.type.startsWith("image/") ? (
            <img src={preview} alt="POD preview" className="w-full max-h-48 object-cover" />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/30">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? (selectedFile.size / 1024).toFixed(0) + " KB" : ""}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 p-3 bg-card border-t border-border">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> Subir POD</>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} disabled={uploading}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status History Timeline ─────────────────────────────────────────────────
function buildStatusHistory(load: any): { status: string; label: string; timestamp: Date | null; actor: string; note: string }[] {
  const history: { status: string; label: string; timestamp: Date | null; actor: string; note: string }[] = [];

  // Created / Available
  history.push({
    status: "available",
    label: "Carga Creada",
    timestamp: load.createdAt ? new Date(load.createdAt) : null,
    actor: "Sistema",
    note: "Carga registrada en el sistema y disponible para asignación.",
  });

  // Driver accepted → in_transit
  if (load.driverAcceptedAt) {
    history.push({
      status: "in_transit",
      label: "En Tránsito",
      timestamp: new Date(load.driverAcceptedAt),
      actor: load.assignedDriverId ? `Conductor #${load.assignedDriverId}` : "Conductor",
      note: "Conductor aceptó la carga e inició el transporte.",
    });
  }

  // Driver rejected
  if (load.driverRejectedAt) {
    history.push({
      status: "rejected",
      label: "Rechazada por Conductor",
      timestamp: new Date(load.driverRejectedAt),
      actor: load.assignedDriverId ? `Conductor #${load.assignedDriverId}` : "Conductor",
      note: load.driverRejectionReason ? `Razón: ${load.driverRejectionReason}` : "El conductor rechazó la carga.",
    });
  }

  // Current status if advanced beyond available/in_transit
  const STATUS_ORDER = ["available", "in_transit", "delivered", "invoiced", "paid"];
  const currentIdx = STATUS_ORDER.indexOf(load.status);
  if (currentIdx >= 2) {
    // delivered, invoiced, paid — use updatedAt as best timestamp
    const statusLabels: Record<string, string> = {
      delivered: "Entregada",
      invoiced: "Facturada",
      paid: "Pagada",
    };
    const statusNotes: Record<string, string> = {
      delivered: "La carga fue entregada exitosamente en el destino.",
      invoiced: "Factura enviada al cliente, pendiente de pago.",
      paid: "Pago recibido. Carga completada y cerrada.",
    };
    // Add intermediate statuses if we're past them
    for (let i = 2; i <= currentIdx; i++) {
      const s = STATUS_ORDER[i];
      history.push({
        status: s,
        label: statusLabels[s] ?? s,
        timestamp: i === currentIdx ? (load.updatedAt ? new Date(load.updatedAt) : null) : null,
        actor: "Operaciones",
        note: statusNotes[s] ?? "",
      });
    }
  }

  return history;
}

function StatusHistoryCard({ load }: { load: any }) {
  const history = buildStatusHistory(load);
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Historial de Estatus</h3>
      </div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {history.map((event, idx) => {
            const cfg = STATUS_CONFIG[event.status];
            const isLast = idx === history.length - 1;
            const isCurrent = event.status === load.status && isLast;
            return (
              <div key={idx} className="flex gap-3 relative">
                {/* Dot */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 z-10 ${
                  isCurrent
                    ? `${cfg?.bg ?? "bg-primary/10"} ${cfg?.border ?? "border-primary"}`
                    : event.status === "rejected"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-muted/50 border-border"
                }`}>
                  {event.status === "rejected"
                    ? <X className="h-3 w-3 text-red-400" />
                    : isCurrent
                    ? <cfg.icon className={`h-3 w-3 ${cfg.color}`} />
                    : <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                  }
                </div>
                {/* Content */}
                <div className="flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className={`text-xs font-semibold ${
                        isCurrent ? (cfg?.color ?? "text-foreground") : event.status === "rejected" ? "text-red-400" : "text-foreground"
                      }`}>{event.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {event.timestamp ? (
                        <>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="h-2.5 w-2.5" />
                            {event.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Fecha no registrada</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{event.actor}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoadDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [changingStatus, setChangingStatus] = useState(false);
  const loadId = Number(params.id);

  const { data: load, isLoading, error, refetch } = trpc.loads.byId.useQuery(
    { id: loadId },
    { enabled: !isNaN(loadId), retry: false }
  );

  const updateStatusMutation = trpc.loads.updateStatus.useMutation();

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: loadId,
        status: newStatus as any,
      });
      toast.success(`Estado actualizado a "${STATUS_CONFIG[newStatus]?.label}"`);
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar el estatus");
    } finally {
      setChangingStatus(false);
    }
  };

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
  const transitions = STATUS_TRANSITIONS[load.status] ?? [];

  const price = Number(load.price ?? 0);
  const fuel = Number(load.estimatedFuel ?? 0);
  const tolls = Number(load.estimatedTolls ?? 0);
  const netMargin = Number(load.netMargin ?? (price - fuel - tolls));
  const marginPct = price > 0 ? ((netMargin / price) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
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

        {/* ── Status Change Buttons ── */}
        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant="outline"
                disabled={changingStatus}
                onClick={() => handleStatusChange(t.value)}
                className={`gap-1.5 border ${STATUS_CONFIG[t.value]?.border} ${STATUS_CONFIG[t.value]?.color} hover:${STATUS_CONFIG[t.value]?.bg}`}
              >
                {changingStatus ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <t.icon className="h-3.5 w-3.5" />
                )}
                {t.label}
              </Button>
            ))}
          </div>
        )}
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

      {/* ── POD Upload (only for in_transit) ── */}
      {load.status === "in_transit" && (
        <Card className="p-5 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
              <ImageIcon className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Proof of Delivery (POD)</h3>
              <p className="text-xs text-muted-foreground">Sube la foto o PDF del recibo de entrega</p>
            </div>
          </div>

          {load.bolImageUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-400">POD subido</p>
                  <a
                    href={load.bolImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver documento
                  </a>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Puedes reemplazar el POD subiendo uno nuevo:</p>
              <PODUpload loadId={loadId} onSuccess={() => refetch()} />
            </div>
          ) : (
            <PODUpload loadId={loadId} onSuccess={() => refetch()} />
          )}
        </Card>
      )}

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
          {load.bolImageUrl && load.status !== "in_transit" && (
            <div className="pt-2">
              <a
                href={load.bolImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                Ver documento (BOL/POD)
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
            icon={Calendar}
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
                La carga fue entregada. El siguiente paso es generar y enviar la factura al cliente, luego marcarla como "Facturada".
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => setLocation("/accounting-finance")}>
                  <Receipt className="h-3.5 w-3.5" /> Ir a Facturación
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  disabled={changingStatus}
                  onClick={() => handleStatusChange("invoiced")}>
                  {changingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                  Marcar como Facturada
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
                La factura fue enviada al cliente. Cuando recibas el pago, regístralo y marca la carga como pagada.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => setLocation("/transactions")}>
                  <DollarSign className="h-3.5 w-3.5" /> Registrar Pago
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  disabled={changingStatus}
                  onClick={() => handleStatusChange("paid")}>
                  {changingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  Marcar como Pagada
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
                Esta carga está completamente cerrada. El ingreso de {formatCurrency(price)} fue registrado automáticamente en finanzas.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Status History ── */}
      <StatusHistoryCard load={load} />

    </div>
  );
}
