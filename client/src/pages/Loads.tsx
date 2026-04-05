import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Package,
  Search,
  ChevronRight,
  Truck,
  CheckCircle2,
  Receipt,
  CreditCard,
  Plus,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  available: {
    label: "Disponible",
    color: "text-blue-300",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    icon: Package,
  },
  in_transit: {
    label: "En Tránsito",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    icon: Truck,
  },
  delivered: {
    label: "Entregada",
    color: "text-green-300",
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    icon: CheckCircle2,
  },
  invoiced: {
    label: "Facturada",
    color: "text-purple-300",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    icon: Receipt,
  },
  paid: {
    label: "Pagada",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    icon: CreditCard,
  },
};

const STATUS_TABS = [
  { value: "all", label: "Todas" },
  { value: "available", label: "Disponibles" },
  { value: "in_transit", label: "En Tránsito" },
  { value: "delivered", label: "Entregadas" },
  { value: "invoiced", label: "Facturadas" },
  { value: "paid", label: "Pagadas" },
];

export default function Loads() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();

  const { data: loads, isLoading, error } = trpc.loads.list.useQuery(undefined, {
    retry: false,
  });

  const safeLoads: any[] = Array.isArray(loads) ? loads : [];

  const countByStatus = safeLoads.reduce((acc: Record<string, number>, load: any) => {
    acc[load.status] = (acc[load.status] ?? 0) + 1;
    return acc;
  }, {});

  const filteredLoads = safeLoads.filter((load: any) => {
    const matchesTab = activeTab === "all" || load.status === activeTab;
    const matchesSearch =
      search === "" ||
      String(load.clientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(load.pickupAddress ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(load.deliveryAddress ?? "").toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="space-y-5 px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-white">Gestión de Cargas</h1>
            <p className="mt-2 text-sm text-slate-300">
              {safeLoads.length} cargas en total · Selecciona una para ver el detalle
            </p>
          </div>

          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setLocation("/quotation")}
          >
            <Plus className="h-4 w-4" />
            Nueva Carga
          </Button>
        </div>

        {/* Summary Cards */}
        {safeLoads.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = countByStatus[status] ?? 0;
              const Icon = cfg.icon;
              const isActive = activeTab === status;

              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(isActive ? "all" : status)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? `${cfg.bg} ${cfg.border}`
                      : "border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive ? cfg.bg : "bg-slate-800"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? cfg.color : "text-slate-300"
                      }`}
                    />
                  </div>

                  <div>
                    <p className={`text-3xl font-bold ${isActive ? cfg.color : "text-white"}`}>
                      {count}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">{cfg.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === "all" ? safeLoads.length : countByStatus[tab.value] ?? 0;
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, origen o destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-700 bg-slate-950 pl-10 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Load List */}
        <Card className="border-slate-700 bg-slate-900 p-4 text-slate-100">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-sm text-slate-300">Cargando cargas...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-2 h-10 w-10 text-slate-500" />
              <p className="text-sm text-slate-300">
                No se pudieron cargar las cargas. Verifica tu sesión.
              </p>
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto mb-2 h-10 w-10 text-slate-500" />
              <p className="mb-1 text-sm font-medium text-white">
                {search
                  ? "Sin resultados"
                  : `No hay cargas ${
                      activeTab !== "all"
                        ? `en estado "${STATUS_CONFIG[activeTab]?.label}"`
                        : ""
                    }`}
              </p>
              <p className="text-xs text-slate-300">
                {search
                  ? "Intenta con otro término de búsqueda."
                  : activeTab !== "all"
                  ? "Prueba seleccionando otro filtro."
                  : "Crea tu primera carga con el botón de arriba."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="mb-3 text-xs text-slate-300">
                Mostrando {filteredLoads.length} de {safeLoads.length} cargas
              </p>

              {filteredLoads.map((load: any) => {
                const cfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
                const Icon = cfg.icon;

                return (
                  <div
                    key={load.id}
                    onClick={() => setLocation(`/loads/${load.id}`)}
                    className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 transition-all hover:border-blue-500/30 hover:bg-slate-800"
                  >
                    {/* Status icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>

                    {/* Main info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {load.clientName}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-300">
                        {load.pickupAddress} → {load.deliveryAddress}
                      </p>
                    </div>

                    {/* Price & arrow */}
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(load.price)}
                        </p>
                        <p className="text-[10px] text-slate-400">#{load.id}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
