/**
 * Business Plan Analytics Dashboard
 * Visualizes engagement data from the /business-plan page:
 * - Total page views, unique sessions, PDF downloads, contact clicks
 * - Section engagement breakdown (bar chart)
 * - Activity timeline (area chart — last 14 days)
 * - Event type distribution (pie chart)
 * - Recent events feed
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Eye,
  Download,
  Phone,
  Users,
  FileText,
  TrendingUp,
  Activity,
  BookOpen,
  ExternalLink,
  RefreshCw,
  Clock,
} from "lucide-react";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { es as esLocale } from "date-fns/locale";

// ─── Color palette aligned with WV brand ─────────────────────────────────────
const NAVY = "#0f2a4a";
const BLUE = "#1d4ed8";
const BLUE_LIGHT = "#3b82f6";
const BLUE_PALE = "#93c5fd";
const TEAL = "#0ea5e9";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#ef4444";

const EVENT_COLORS: Record<string, string> = {
  page_view: BLUE,
  section_view: BLUE_LIGHT,
  pdf_download: GREEN,
  contact_click: AMBER,
  form_submit: TEAL,
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page Views",
  section_view: "Section Views",
  pdf_download: "PDF Downloads",
  contact_click: "Contact Clicks",
  form_submit: "Form Submits",
};

// Human-readable section names
const SECTION_LABELS: Record<string, string> = {
  "executive-summary": "Executive Summary",
  "company-overview": "Company Overview",
  "mission-vision": "Mission & Vision",
  "market-opportunity": "Market Opportunity",
  services: "Services",
  "target-customers": "Target Customers",
  "competitive-advantage": "Competitive Advantage",
  operations: "Operations Plan",
  technology: "Technology",
  marketing: "Marketing",
  "revenue-model": "Revenue Model",
  "financial-plan": "Financial Plan",
  "growth-plan": "12-Month Plan",
  funding: "Funding",
  "why-win": "Why We Win",
  contact: "Contact",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = BLUE,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
      />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          <TrendingUp size={14} className="text-muted-foreground mt-1" />
        </div>
        <div
          className="text-3xl font-bold mb-1 tabular-nums"
          style={{ color: NAVY }}
        >
          {value}
        </div>
        <div className="text-sm font-semibold text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {EVENT_LABELS[p.name] || p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BusinessPlanAnalytics() {
  const { data, isLoading, refetch, isFetching } =
    trpc.analytics.getSummary.useQuery(undefined, {
      refetchInterval: 60_000, // auto-refresh every 60s
    });

  // ── Derived metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!data) return null;

    const events = data.events || [];
    const totals = data.totals || {};

    // Timeline: group events by day (last 14 days)
    const today = startOfDay(new Date());
    const days: Record<string, Record<string, number>> = {};
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(today, i), "MMM d", { locale: esLocale });
      days[d] = { page_view: 0, pdf_download: 0, contact_click: 0, section_view: 0 };
    }
    events.forEach((e) => {
      const d = format(new Date(e.createdAt), "MMM d", { locale: esLocale });
      if (days[d] !== undefined) {
        days[d][e.eventType] = (days[d][e.eventType] || 0) + 1;
      }
    });
    const timeline = Object.entries(days).map(([date, counts]) => ({ date, ...counts }));

    // Section engagement: count section_view events per sectionId
    const sectionCounts: Record<string, number> = {};
    events
      .filter((e) => e.eventType === "section_view" && e.sectionId)
      .forEach((e) => {
        const key = e.sectionId!;
        sectionCounts[key] = (sectionCounts[key] || 0) + 1;
      });
    const sectionData = Object.entries(sectionCounts)
      .map(([id, count]) => ({
        name: SECTION_LABELS[id] || id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Pie chart: event type distribution (excluding section_view for clarity)
    const pieData = Object.entries(totals)
      .filter(([key]) => key !== "section_view")
      .map(([key, value]) => ({
        name: EVENT_LABELS[key] || key,
        value,
        color: EVENT_COLORS[key] || BLUE_PALE,
      }));

    // Recent events feed (last 20)
    const recentEvents = events.slice(0, 20);

    return {
      timeline,
      sectionData,
      pieData,
      recentEvents,
      pageViews: totals["page_view"] || 0,
      pdfDownloads: totals["pdf_download"] || 0,
      contactClicks: totals["contact_click"] || 0,
      uniqueSessions: data.uniqueSessions || 0,
      totalEvents: data.totalEvents || 0,
    };
  }, [data]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-72 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!metrics || metrics.totalEvents === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: `${BLUE}12` }}
        >
          <Activity size={36} style={{ color: BLUE }} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No hay datos aún</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Los datos de analíticas aparecerán aquí en cuanto alguien visite la
          página del Business Plan en{" "}
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/business-plan</code>.
        </p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="gap-2"
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualizar
        </Button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${NAVY}, ${BLUE})` }}
          >
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Business Plan Analytics
            </h1>
            <p className="text-sm text-slate-500">
              Engagement de inversores y bancos en el plan de negocios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 text-xs border-green-200 text-green-700 bg-green-50"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live · Auto-refresh 60s
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open("/business-plan", "_blank")}
          >
            <ExternalLink size={13} />
            Ver Plan
          </Button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Eye}
          label="Page Views"
          value={metrics.pageViews}
          sub="Total de visitas al plan"
          color={BLUE}
        />
        <KpiCard
          icon={Users}
          label="Unique Sessions"
          value={metrics.uniqueSessions}
          sub="Visitantes únicos estimados"
          color={TEAL}
        />
        <KpiCard
          icon={Download}
          label="PDF Downloads"
          value={metrics.pdfDownloads}
          sub="Exportaciones del plan"
          color={GREEN}
        />
        <KpiCard
          icon={Phone}
          label="Contact Clicks"
          value={metrics.contactClicks}
          sub="Interés directo de contacto"
          color={AMBER}
        />
      </div>

      {/* ── Timeline + Pie ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Activity Timeline */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity size={16} style={{ color: BLUE }} />
              Actividad — Últimos 14 días
            </CardTitle>
            <CardDescription className="text-xs">
              Vistas de página, descargas y clics de contacto por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={metrics.timeline}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradView" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="page_view"
                  stroke={BLUE}
                  strokeWidth={2}
                  fill="url(#gradView)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="pdf_download"
                  stroke={GREEN}
                  strokeWidth={2}
                  fill="url(#gradDl)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="contact_click"
                  stroke={AMBER}
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {[
                { key: "page_view", label: "Page Views", color: BLUE },
                { key: "pdf_download", label: "PDF Downloads", color: GREEN },
                { key: "contact_click", label: "Contact Clicks", color: AMBER },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className="w-3 h-0.5 rounded-full inline-block"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Event Distribution Pie */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp size={16} style={{ color: BLUE }} />
              Distribución de Eventos
            </CardTitle>
            <CardDescription className="text-xs">
              Proporción por tipo de interacción
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {metrics.pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-slate-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Sin datos suficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section Engagement ── */}
      {metrics.sectionData.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen size={16} style={{ color: BLUE }} />
              Secciones Más Leídas
            </CardTitle>
            <CardDescription className="text-xs">
              Número de visitantes que llegaron a cada sección del plan de negocios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={metrics.sectionData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickLine={false}
                  axisLine={false}
                  width={160}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Visitantes"]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={BLUE}>
                  {metrics.sectionData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={`oklch(${0.45 - index * 0.02} 0.18 258)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Events Feed ── */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock size={16} style={{ color: BLUE }} />
            Eventos Recientes
          </CardTitle>
          <CardDescription className="text-xs">
            Últimas 20 interacciones registradas en el plan de negocios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentEvents.map((event, i) => (
              <div
                key={event.id ?? i}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {/* Event type icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${EVENT_COLORS[event.eventType] || BLUE}15`,
                  }}
                >
                  {event.eventType === "page_view" && (
                    <Eye size={14} style={{ color: EVENT_COLORS[event.eventType] }} />
                  )}
                  {event.eventType === "pdf_download" && (
                    <Download size={14} style={{ color: EVENT_COLORS[event.eventType] }} />
                  )}
                  {event.eventType === "contact_click" && (
                    <Phone size={14} style={{ color: EVENT_COLORS[event.eventType] }} />
                  )}
                  {event.eventType === "section_view" && (
                    <BookOpen size={14} style={{ color: EVENT_COLORS[event.eventType] }} />
                  )}
                  {event.eventType === "form_submit" && (
                    <FileText size={14} style={{ color: EVENT_COLORS[event.eventType] }} />
                  )}
                </div>

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">
                      {EVENT_LABELS[event.eventType] || event.eventType}
                    </span>
                    {event.sectionId && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0 h-4"
                      >
                        {SECTION_LABELS[event.sectionId] || event.sectionId}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>
                      {format(new Date(event.createdAt), "MMM d, yyyy · HH:mm", {
                        locale: esLocale,
                      })}
                    </span>
                    {event.sessionId && (
                      <span className="font-mono opacity-60">
                        #{event.sessionId.slice(-6)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge */}
                <Badge
                  variant="outline"
                  className="text-xs flex-shrink-0"
                  style={{
                    borderColor: `${EVENT_COLORS[event.eventType] || BLUE}40`,
                    color: EVENT_COLORS[event.eventType] || BLUE,
                  }}
                >
                  {event.eventType.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>

          {metrics.totalEvents > 20 && (
            <p className="text-center text-xs text-slate-400 mt-4 pt-3 border-t">
              Mostrando los 20 eventos más recientes de {metrics.totalEvents} totales
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
