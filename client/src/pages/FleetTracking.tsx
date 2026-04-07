/**
 * FleetTracking.tsx
 * Unified fleet operations dashboard
 *
 * Combines:
 * - Real-time fleet map
 * - Driver/fleet management
 * - Operational progress by load stage
 *
 * Goal:
 * Keep the good parts of the old experience, but make it more operational:
 * driver + GPS + active load + current shipment stage
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Truck,
  Users,
  Navigation,
  RefreshCw,
  Edit2,
  Check,
  X,
  DollarSign,
  Shield,
  Package,
  Clock,
  Wifi,
  WifiOff,
  MapPin,
  Route,
  CheckCircle2,
  FileText,
  CreditCard,
  Search,
  Activity,
} from "lucide-react";

/**
 * Fleet constants
 */
const FLEET_COLORS: Record<string, { bg: string; text: string; marker: string; border: string }> = {
  internal: {
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    marker: "#3b82f6",
    border: "border-blue-500/30",
  },
  leased: {
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    marker: "#a855f7",
    border: "border-purple-500/30",
  },
  external: {
    bg: "bg-orange-500/20",
    text: "text-orange-300",
    marker: "#f97316",
    border: "border-orange-500/30",
  },
};

const FLEET_LABELS: Record<string, string> = {
  internal: "Interno",
  leased: "Arrendado",
  external: "Externo",
};

const FLEET_TYPES = [
  {
    value: "internal",
    label: "Interno",
    desc: "Empleado directo de WV",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    value: "leased",
    label: "Arrendado",
    desc: "Contrato de arrendamiento",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    value: "external",
    label: "Externo",
    desc: "Contratista independiente",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
] as const;

const LOAD_STATUS_META: Record<
  string,
  { label: string; className: string; icon: any; step: number }
> = {
  available: {
    label: "Disponible",
    className: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: Package,
    step: 0,
  },
  quoted: {
    label: "Cotizada",
    className: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    icon: FileText,
    step: 1,
  },
  assigned: {
    label: "Asignada",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: Truck,
    step: 2,
  },
  started: {
    label: "Iniciada",
    className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: Activity,
    step: 3,
  },
  in_transit: {
    label: "En tránsito",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: Navigation,
    step: 4,
  },
  delivered: {
    label: "Entregada",
    className: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: CheckCircle2,
    step: 5,
  },
  invoiced: {
    label: "Facturada",
    className: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    icon: FileText,
    step: 6,
  },
  paid: {
    label: "Pagada",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: CreditCard,
    step: 7,
  },
};

const OPERATION_FLOW = [
  { key: "assigned", label: "Asignada" },
  { key: "started", label: "Iniciada" },
  { key: "in_transit", label: "En tránsito" },
  { key: "delivered", label: "Entregada" },
  { key: "invoiced", label: "Facturada" },
  { key: "paid", label: "Pagada" },
];

/**
 * Google Maps via Manus proxy
 */
const FORGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.maps) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src*="${MAPS_PROXY_URL}/maps/api/js"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${FORGE_API_KEY}&v=weekly&libraries=marker,places,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Failed to load Google Maps via Manus proxy. Check VITE_FRONTEND_FORGE_API_KEY."
        )
      );

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

/**
 * Helpers
 */
type EditState = {
  driverId: number;
  fleetType: string;
  commissionPercent: string;
  dotNumber: string;
};

function getTimeSince(ts?: string | Date | null): string {
  if (!ts) return "Sin registro";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function toNumber(value: any, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? fallback));
  return Number.isFinite(n) ? n : fallback;
}

function getSafeFleetType(type?: string) {
  return FLEET_LABELS[type || ""] ? type! : "internal";
}

function normalizeLoadStatus(raw?: string | null): string {
  if (!raw) return "assigned";

  const value = String(raw).toLowerCase();

  if (LOAD_STATUS_META[value]) return value;

  if (value === "picked_up" || value === "pickup" || value === "started") return "started";
  if (value === "transit" || value === "en_route") return "in_transit";
  if (value === "complete") return "delivered";
  if (value === "billing") return "invoiced";

  return "assigned";
}

function getStatusMeta(status?: string | null) {
  const normalized = normalizeLoadStatus(status);
  return LOAD_STATUS_META[normalized] || LOAD_STATUS_META.assigned;
}

function StatusBadge({ status }: { status?: string | null }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${meta.className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function FleetBadge({ type }: { type?: string | null }) {
  const safeType = getSafeFleetType(type || undefined);
  const fleet = FLEET_TYPES.find((f) => f.value === safeType) ?? FLEET_TYPES[0];

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${fleet.color}`}>
      {fleet.label}
    </span>
  );
}

function LoadProgress({ status }: { status?: string | null }) {
  const current = getStatusMeta(status);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {OPERATION_FLOW.map((step) => {
          const meta = LOAD_STATUS_META[step.key];
          const active = current.step >= meta.step;

          return (
            <div
              key={step.key}
              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${
                active
                  ? meta.className
                  : "border-slate-700 bg-slate-800 text-slate-500"
              }`}
            >
              {meta.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function deriveDriverOperation(driver: any, location: any) {
  const activeLoad = location?.activeLoad || driver?.activeLoad || null;
  const loadStatus = normalizeLoadStatus(activeLoad?.status);

  return {
    hasGps: !!location,
    activeLoad,
    loadStatus,
    routeLabel: activeLoad
      ? `${activeLoad?.origin || activeLoad?.pickupAddress || "Origen"} → ${
          activeLoad?.destination || activeLoad?.deliveryAddress || "Destino"
        }`
      : "Sin carga activa",
    clientLabel:
      activeLoad?.clientName ||
      activeLoad?.brokerName ||
      activeLoad?.customerName ||
      "Sin cliente",
  };
}

/**
 * Management View
 */
function FleetManagementView({
  drivers,
  locationsByDriverId,
}: {
  drivers: any[];
  locationsByDriverId: Map<number, any>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [search, setSearch] = useState("");

  const { refetch } = trpc.admin.getDrivers.useQuery(undefined, { enabled: false });

  const updateMutation = trpc.admin.updateDriverFleet.useMutation({
    onSuccess: async () => {
      toast.success("Chofer actualizado correctamente");
      setEditingId(null);
      setEditState(null);
      await refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const startEdit = (driver: any) => {
    setEditingId(driver.id);
    setEditState({
      driverId: driver.id,
      fleetType: driver.fleetType ?? "internal",
      commissionPercent: String(driver.commissionPercent ?? "0"),
      dotNumber: driver.dotNumber ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = () => {
    if (!editState) return;

    const commission = toNumber(editState.commissionPercent, 0);

    if (commission < 0 || commission > 100) {
      toast.error("La comisión debe estar entre 0 y 100");
      return;
    }

    updateMutation.mutate({
      driverId: editState.driverId,
      fleetType: editState.fleetType as "internal" | "leased" | "external",
      commissionPercent: commission,
      dotNumber: editState.dotNumber || undefined,
    });
  };

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return drivers;

    return drivers.filter((driver) => {
      const operation = deriveDriverOperation(driver, locationsByDriverId.get(driver.id));
      return (
        String(driver.name ?? "").toLowerCase().includes(term) ||
        String(driver.email ?? "").toLowerCase().includes(term) ||
        String(driver.dotNumber ?? "").toLowerCase().includes(term) ||
        String(operation.clientLabel ?? "").toLowerCase().includes(term)
      );
    });
  }, [drivers, locationsByDriverId, search]);

  if (!drivers) {
    return <div className="py-8 text-center text-muted-foreground">Cargando choferes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar chofer, email, DOT o cliente..."
          className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>No hay conductores para mostrar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDrivers.map((driver: any) => {
            const isEditing = editingId === driver.id;
            const location = locationsByDriverId.get(driver.id);
            const operation = deriveDriverOperation(driver, location);
            const safeFleetType = getSafeFleetType(driver.fleetType);

            return (
              <Card key={driver.id} className="border-slate-800 bg-slate-900/80">
                <CardContent className="p-5">
                  {isEditing && editState ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{driver.name}</p>
                          <p className="text-sm text-slate-400">{driver.email}</p>
                        </div>
                        <StatusBadge status={operation.loadStatus} />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-300">
                            Tipo de Flota
                          </label>
                          <Select
                            value={editState.fleetType}
                            onValueChange={(v) => setEditState({ ...editState, fleetType: v })}
                          >
                            <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                              {FLEET_TYPES.map((ft) => (
                                <SelectItem key={ft.value} value={ft.value}>
                                  {ft.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-300">
                            Comisión %
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={editState.commissionPercent}
                            onChange={(e) =>
                              setEditState({ ...editState, commissionPercent: e.target.value })
                            }
                            className="border-slate-700 bg-slate-800 text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-300">
                            Número DOT
                          </label>
                          <Input
                            value={editState.dotNumber}
                            onChange={(e) =>
                              setEditState({ ...editState, dotNumber: e.target.value })
                            }
                            placeholder="DOT123456"
                            className="border-slate-700 bg-slate-800 text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-200">Estado operativo actual</p>
                          <StatusBadge status={operation.loadStatus} />
                        </div>
                        <p className="text-sm text-slate-400">{operation.clientLabel}</p>
                        <p className="text-xs text-slate-500">{operation.routeLabel}</p>
                        <LoadProgress status={operation.loadStatus} />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={saveEdit} disabled={updateMutation.isPending} className="gap-2">
                          <Check className="h-4 w-4" />
                          Guardar
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} className="gap-2">
                          <X className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 font-bold text-white">
                            {(driver.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{driver.name}</p>
                              <FleetBadge type={safeFleetType} />
                              <Badge
                                variant="outline"
                                className="border-slate-700 text-slate-400"
                              >
                                {driver.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400">{driver.email}</p>
                            {driver.phone ? (
                              <p className="text-xs text-slate-500">{driver.phone}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">GPS</p>
                            <p
                              className={`text-xs font-medium ${
                                operation.hasGps ? "text-emerald-400" : "text-slate-500"
                              }`}
                            >
                              {operation.hasGps ? "Activo" : "Inactivo"}
                            </p>
                          </div>

                          <Button variant="outline" onClick={() => startEdit(driver)} className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs text-slate-500">Comisión WV</p>
                          <p className="font-semibold text-amber-400">
                            {toNumber(driver.commissionPercent, 0)}%
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs text-slate-500">Chofer recibe</p>
                          <p className="font-semibold text-emerald-400">
                            {100 - toNumber(driver.commissionPercent, 0)}%
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs text-slate-500">DOT</p>
                          <p className="font-semibold text-slate-200">
                            {driver.dotNumber || "—"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-xs text-slate-500">Último ping</p>
                          <p className="font-semibold text-slate-200">
                            {getTimeSince(location?.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 text-blue-400" />
                            <p className="font-medium text-white">Operación actual</p>
                          </div>
                          <StatusBadge status={operation.loadStatus} />
                        </div>

                        {operation.activeLoad ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div>
                                <p className="text-xs text-slate-500">Cliente / Broker</p>
                                <p className="text-sm font-medium text-slate-200">
                                  {operation.clientLabel}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500">Ruta</p>
                                <p className="text-sm font-medium text-slate-200">
                                  {operation.routeLabel}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500">Velocidad</p>
                                <p className="text-sm font-medium text-slate-200">
                                  {location?.speed ? `${Math.round(location.speed)} mph` : "—"}
                                </p>
                              </div>
                            </div>

                            <LoadProgress status={operation.loadStatus} />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-800 p-4 text-sm text-slate-500">
                            Sin carga activa en este momento.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Map View
 */
function FleetMapView({
  locations,
  lastRefresh,
  onManualRefresh,
  isRefreshing,
}: {
  locations: any[];
  lastRefresh: Date;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMapsScript();
        if (cancelled || !mapContainerRef.current) return;

        const google = (window as any).google;

        const map = new google.maps.Map(mapContainerRef.current, {
          zoom: 7,
          center: { lat: 40.7128, lng: -74.006 },
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
          ],
        });

        infoWindowRef.current = new google.maps.InfoWindow();
        setMapInstance(map);
        setMapReady(true);
      } catch (err: any) {
        if (!cancelled) setMapError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !locations) return;

    const google = (window as any).google;
    const currentIds = new Set(locations.map((l: any) => l.driverId));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    locations.forEach((loc: any) => {
      const safeFleetType = getSafeFleetType(loc.fleetType);
      const color = FLEET_COLORS[safeFleetType]?.marker ?? "#3b82f6";
      const existing = markersRef.current.get(loc.driverId);
      const position = { lat: loc.latitude, lng: loc.longitude };
      const statusMeta = getStatusMeta(loc?.activeLoad?.status);

      if (existing) {
        existing.setPosition(position);
      } else {
        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          title: loc.driverName ?? "Conductor",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: (loc.driverName ?? "?").charAt(0).toUpperCase(),
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        marker.addListener("click", () => {
          setSelectedDriver(loc.driverId);

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family: sans-serif; padding: 8px; min-width: 240px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${loc.driverName ?? "Conductor"}</div>
                <div style="font-size: 12px; margin-bottom: 6px; color: #666;">
                  ${FLEET_LABELS[safeFleetType]}
                </div>
                ${
                  loc.activeLoad
                    ? `
                      <div style="font-size: 12px; color: #444; margin-bottom: 2px;">📦 ${
                        loc.activeLoad.clientName ||
                        loc.activeLoad.brokerName ||
                        "Carga activa"
                      }</div>
                      <div style="font-size: 11px; color: #777; margin-bottom: 4px;">
                        ${
                          loc.activeLoad.origin ||
                          loc.activeLoad.pickupAddress ||
                          "Origen"
                        } → ${
                        loc.activeLoad.destination ||
                        loc.activeLoad.deliveryAddress ||
                        "Destino"
                      }
                      </div>
                      <div style="font-size: 11px; font-weight: 600; color: #111;">
                        Estado: ${statusMeta.label}
                      </div>
                    `
                    : `<div style="font-size: 12px; color: #999;">Sin carga activa</div>`
                }
                ${
                  loc.speed
                    ? `<div style="font-size: 11px; color: #666; margin-top: 6px;">🚗 ${Math.round(
                        loc.speed
                      )} mph</div>`
                    : ""
                }
              </div>
            `);
            infoWindowRef.current.open(mapInstance, marker);
          }
        });

        markersRef.current.set(loc.driverId, marker);
      }
    });

    if (locations.length > 0 && markersRef.current.size > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc: any) =>
        bounds.extend({ lat: loc.latitude, lng: loc.longitude })
      );

      if (locations.length === 1) {
        mapInstance.setCenter({
          lat: locations[0].latitude,
          lng: locations[0].longitude,
        });
        mapInstance.setZoom(12);
      } else {
        mapInstance.fitBounds(bounds, 80);
      }
    }
  }, [mapInstance, locations]);

  const activeCount = locations?.length ?? 0;
  const inRouteCount =
    locations?.filter((l: any) => {
      const status = normalizeLoadStatus(l?.activeLoad?.status);
      return ["assigned", "started", "in_transit"].includes(status);
    }).length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* Side panel */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Navigation className="h-5 w-5 text-blue-400" />
                GPS Multi-Track
              </CardTitle>
              <CardDescription>
                Seguimiento en tiempo real por conductor y carga.
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" onClick={onManualRefresh} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-px border-b border-slate-800 bg-slate-800">
            <div className="bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Conductores activos</p>
              <p className="text-2xl font-bold text-white">{activeCount}</p>
            </div>
            <div className="bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Con carga en curso</p>
              <p className="text-2xl font-bold text-emerald-400">{inRouteCount}</p>
            </div>
          </div>

          {activeCount === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <WifiOff className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>Sin conductores activos</p>
              <p className="mt-1 text-xs text-slate-600">
                Los choferes aparecen aquí cuando comparten GPS.
              </p>
            </div>
          ) : (
            <div className="max-h-[620px] divide-y divide-slate-800 overflow-y-auto">
              {locations.map((loc: any) => {
                const safeFleetType = getSafeFleetType(loc.fleetType);
                const colors = FLEET_COLORS[safeFleetType];
                const isSelected = selectedDriver === loc.driverId;
                const operation = deriveDriverOperation({}, loc);

                return (
                  <div
                    key={loc.driverId}
                    className={`cursor-pointer p-4 transition-colors ${
                      isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                    }`}
                    onClick={() => {
                      setSelectedDriver(loc.driverId);
                      if (mapInstance) {
                        mapInstance.panTo({ lat: loc.latitude, lng: loc.longitude });
                        mapInstance.setZoom(13);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}
                      >
                        <span className={`font-bold ${colors.text}`}>
                          {(loc.driverName ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {loc.driverName ?? "Conductor"}
                          </p>
                          <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <FleetBadge type={safeFleetType} />
                          {loc.speed ? (
                            <span className="text-xs text-slate-500">
                              {Math.round(loc.speed)} mph
                            </span>
                          ) : null}
                        </div>

                        {operation.activeLoad ? (
                          <div className="mt-2 space-y-1 rounded-md bg-slate-950/60 p-2">
                            <p className="truncate text-xs text-slate-300">
                              📦 {operation.clientLabel}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {operation.routeLabel}
                            </p>
                            <div className="pt-1">
                              <StatusBadge status={operation.loadStatus} />
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">Sin carga activa</p>
                        )}

                        <p className="mt-2 text-xs text-slate-600">
                          {getTimeSince(loc.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-800 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Leyenda</p>
            <div className="space-y-1.5">
              {Object.entries(FLEET_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: FLEET_COLORS[key]?.marker }}
                  />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900">
        <CardContent className="relative h-[760px] p-0">
          <div ref={mapContainerRef} className="h-full w-full" />

          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
                <p className="text-sm text-slate-400">Cargando mapa...</p>
                <p className="mt-1 text-xs text-slate-600">
                  Obteniendo configuración del servidor...
                </p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="max-w-sm px-6 text-center">
                <MapPin className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <h3 className="mb-2 font-semibold text-white">Mapa no disponible</h3>
                <p className="mb-4 text-sm text-slate-400">{mapError}</p>
                <div className="rounded-lg bg-slate-800 p-4 text-left">
                  <p className="mb-2 text-xs font-medium text-slate-500">Posible causa:</p>
                  <p className="text-xs text-slate-400">
                    Verifica que{" "}
                    <code className="rounded bg-slate-700 px-1">
                      VITE_FRONTEND_FORGE_API_KEY
                    </code>{" "}
                    esté configurado en Railway.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mapReady && activeCount === 0 && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-300">
                Sin conductores activos en este momento
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Los conductores deben activar el GPS en la app del driver.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Component
 */
export default function FleetTracking() {
  const [activeTab, setActiveTab] = useState("map");

  const {
    data: driversRaw,
    refetch: refetchDrivers,
    isLoading: driversLoading,
  } = trpc.admin.getDrivers.useQuery();

  const {
    data: locationsRaw,
    refetch: refetchLocations,
    isLoading: locationsLoading,
  } = trpc.admin.getFleetLocations.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      void refetchLocations();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchLocations]);

  const drivers = Array.isArray(driversRaw) ? driversRaw : [];
  const locations = Array.isArray(locationsRaw) ? locationsRaw : [];

  const locationsByDriverId = useMemo(() => {
    const map = new Map<number, any>();
    locations.forEach((loc: any) => map.set(loc.driverId, loc));
    return map;
  }, [locations]);

  const enrichedDrivers = useMemo(() => {
    return drivers.map((driver: any) => {
      const location = locationsByDriverId.get(driver.id);
      const operation = deriveDriverOperation(driver, location);

      return {
        ...driver,
        __location: location,
        __operation: operation,
      };
    });
  }, [drivers, locationsByDriverId]);

  const fleetStats = useMemo(() => {
    return {
      totalDrivers: drivers.length,
      internal: drivers.filter((d: any) => getSafeFleetType(d.fleetType) === "internal").length,
      leased: drivers.filter((d: any) => getSafeFleetType(d.fleetType) === "leased").length,
      external: drivers.filter((d: any) => getSafeFleetType(d.fleetType) === "external").length,
      gpsActive: locations.length,
      withActiveLoad: enrichedDrivers.filter((d: any) => d.__operation?.activeLoad).length,
      assigned: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "assigned").length,
      started: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "started").length,
      inTransit: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "in_transit").length,
      delivered: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "delivered").length,
      invoiced: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "invoiced").length,
      paid: enrichedDrivers.filter((d: any) => d.__operation?.loadStatus === "paid").length,
    };
  }, [drivers, locations, enrichedDrivers]);

  const handleManualRefresh = async () => {
    await Promise.all([refetchDrivers(), refetchLocations()]);
    setLastRefresh(new Date());
    toast.success("Flota actualizada");
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fleet & Drivers</h1>
          <p className="mt-1 text-slate-400">
            Seguimiento GPS, gestión de choferes y progreso operativo de cargas.
          </p>
        </div>

        <Button onClick={handleManualRefresh} variant="outline" className="gap-2 self-start">
          <RefreshCw
            className={`h-4 w-4 ${
              driversLoading || locationsLoading ? "animate-spin" : ""
            }`}
          />
          Actualizar ahora
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Choferes</p>
            <p className="text-2xl font-bold text-white">{fleetStats.totalDrivers}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">GPS activos</p>
            <p className="text-2xl font-bold text-emerald-400">{fleetStats.gpsActive}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Con carga</p>
            <p className="text-2xl font-bold text-blue-400">{fleetStats.withActiveLoad}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">En tránsito</p>
            <p className="text-2xl font-bold text-amber-400">{fleetStats.inTransit}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Entregadas</p>
            <p className="text-2xl font-bold text-green-400">{fleetStats.delivered}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Facturadas / Pagadas</p>
            <p className="text-2xl font-bold text-indigo-400">
              {fleetStats.invoiced + fleetStats.paid}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operation flow snapshot */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Flujo operacional actual</CardTitle>
          <CardDescription>
            Vista rápida del punto en que van las cargas que están moviendo los choferes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Asignadas</p>
              <p className="text-xl font-bold text-blue-400">{fleetStats.assigned}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Iniciadas</p>
              <p className="text-xl font-bold text-cyan-400">{fleetStats.started}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">En tránsito</p>
              <p className="text-xl font-bold text-amber-400">{fleetStats.inTransit}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Entregadas</p>
              <p className="text-xl font-bold text-green-400">{fleetStats.delivered}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Facturadas</p>
              <p className="text-xl font-bold text-indigo-400">{fleetStats.invoiced}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Pagadas</p>
              <p className="text-xl font-bold text-emerald-400">{fleetStats.paid}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Última actualización: {getTimeSince(lastRefresh)}
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-slate-900">
          <TabsTrigger value="map" className="gap-2">
            <MapPin className="h-4 w-4" />
            Mapa operativo
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-2">
            <Users className="h-4 w-4" />
            Gestión de flota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <FleetMapView
            locations={locations}
            lastRefresh={lastRefresh}
            onManualRefresh={handleManualRefresh}
            isRefreshing={driversLoading || locationsLoading}
          />
        </TabsContent>

        <TabsContent value="management" className="mt-4">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Choferes y estado de operación</CardTitle>
              <CardDescription>
                Edita configuración de flota y visualiza en qué fase va cada carga.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FleetManagementView
                drivers={drivers}
                locationsByDriverId={locationsByDriverId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
