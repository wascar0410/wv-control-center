import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Briefcase,
  Download,
  Plus,
  Edit,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  UserRound,
  CalendarDays,
  Truck,
  Target,
  BarChart3,
  FolderOpen,
  CheckCircle2,
  Globe,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type StatusType =
  | "valid"
  | "active"
  | "ready"
  | "in-progress"
  | "on-track"
  | "expired"
  | "missing";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function isFutureDate(value?: string | Date | null) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function toStatusFromDate(value?: string | Date | null): StatusType {
  if (!value) return "missing";
  return isFutureDate(value) ? "valid" : "expired";
}

export default function Company() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const {
    data: companiesRaw,
    isLoading,
    refetch,
  } = trpc.company.getAll.useQuery();

  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const selectedCompany =
    companies.find((company: any) => company.id === selectedCompanyId) ?? companies[0] ?? null;

  const companyData = useMemo(() => {
    if (!selectedCompany) return null;

    const addressParts = [
      selectedCompany.address,
      selectedCompany.city,
      selectedCompany.state,
      selectedCompany.zipCode,
      selectedCompany.country,
    ].filter(Boolean);

    return {
      id: selectedCompany.id,
      name: selectedCompany.name || "—",
      legalName: selectedCompany.name || "—",
      dot: selectedCompany.dotNumber || "—",
      mc: selectedCompany.mcNumber || "—",
      address: addressParts.length ? addressParts.join(", ") : "—",
      phone: selectedCompany.phone || "—",
      email: selectedCompany.email || "—",
      website: selectedCompany.website || "—",
      owner: {
        name: "Owner",
        title: "Owner / Admin",
        email: selectedCompany.email || "—",
      },
      operationType: "For-Hire Carrier",
      established: "—",
      description: selectedCompany.description || "Sin descripción registrada",
      insuranceProvider: selectedCompany.insuranceProvider || "—",
      insurancePolicyNumber: selectedCompany.insurancePolicyNumber || "—",
      insuranceExpiryDate: selectedCompany.insuranceExpiryDate || null,
      complianceStatus: selectedCompany.complianceStatus || "active",
      logoUrl: selectedCompany.logoUrl || "",
    };
  }, [selectedCompany]);

  const carrierPacket = useMemo(() => {
    if (!companyData) return [];

    return [
      {
        key: "w9",
        title: "W-9",
        status: companyData.email !== "—" ? "ready" : "missing",
        expiresAt: null,
        extraLabel: "Registro fiscal",
        extraValue: companyData.name,
      },
      {
        key: "insurance",
        title: "Insurance",
        status: companyData.insuranceExpiryDate
          ? toStatusFromDate(companyData.insuranceExpiryDate)
          : "missing",
        expiresAt: companyData.insuranceExpiryDate,
        extraLabel: "Proveedor",
        extraValue: companyData.insuranceProvider,
      },
      {
        key: "authority",
        title: "Authority",
        status: companyData.dot !== "—" || companyData.mc !== "—" ? "active" : "missing",
        expiresAt: null,
        extraLabel: "MC / DOT",
        extraValue: `${companyData.mc} / ${companyData.dot}`,
      },
      {
        key: "profile_pdf",
        title: "Company Profile",
        status: companyData.description ? "ready" : "missing",
        expiresAt: null,
        extraLabel: "Estado",
        extraValue: companyData.description ? "Perfil disponible" : "Perfil incompleto",
      },
    ] as const;
  }, [companyData]);

  const packetCompletion = useMemo(() => {
    if (!carrierPacket.length) return 0;
    const completed = carrierPacket.filter((item) =>
      ["valid", "active", "ready"].includes(item.status)
    ).length;
    return Math.round((completed / carrierPacket.length) * 100);
  }, [carrierPacket]);

  const businessProfile = useMemo(() => {
    if (!companyData) return null;

    return {
      fleetType: "Dry Van",
      equipment: ["53ft Dry Van", "48ft Dry Van", "Reefer Unit"],
      serviceTypes: ["Full Truckload", "Partial Load", "Expedited"],
      coverageAreas: ["Continental US", "Canada", "Mexico"],
      preferredLanes: ["Denver to LA", "Denver to Chicago", "Denver to Dallas"],
    };
  }, [companyData]);

  const strategy = useMemo(() => {
    return {
      goals: [
        { goal: "Expand fleet capacity", timeline: "2026", status: "in-progress" as StatusType },
        { goal: "Improve broker relationships", timeline: "2026", status: "on-track" as StatusType },
        { goal: "Strengthen profitability by lane", timeline: "2026", status: "in-progress" as StatusType },
      ],
      kpis: {
        compliance_status:
          companyData?.complianceStatus === "active" ? "Active" : companyData?.complianceStatus || "—",
        packet_completion: `${packetCompletion}%`,
        insurance_status: companyData?.insuranceExpiryDate
          ? isFutureDate(companyData.insuranceExpiryDate)
            ? "Active"
            : "Expired"
          : "Missing",
        profile_status: companyData?.description ? "Ready" : "Incomplete",
      },
      growth_plan:
        companyData?.description ||
        "Completar perfil corporativo, consolidar carrier packet y fortalecer posicionamiento ante brokers y clientes.",
    };
  }, [companyData, packetCompletion]);

  const documents = useMemo(() => {
    if (!companyData) return [];

    return [
      {
        name: "Company Profile",
        type: "Corporate",
        status: companyData.description ? ("ready" as StatusType) : ("missing" as StatusType),
        meta: companyData.description ? "Perfil generado" : "Perfil incompleto",
      },
      {
        name: "Insurance Information",
        type: "Insurance",
        status: companyData.insuranceExpiryDate
          ? toStatusFromDate(companyData.insuranceExpiryDate)
          : ("missing" as StatusType),
        meta: companyData.insuranceExpiryDate
          ? `Expira ${formatDate(companyData.insuranceExpiryDate)}`
          : "Sin fecha registrada",
      },
      {
        name: "Operating Authority",
        type: "Legal",
        status:
          companyData.dot !== "—" || companyData.mc !== "—"
            ? ("active" as StatusType)
            : ("missing" as StatusType),
        meta: `${companyData.dot} / ${companyData.mc}`,
      },
      {
        name: "Website / Public Presence",
        type: "Brand",
        status: companyData.website !== "—" ? ("active" as StatusType) : ("missing" as StatusType),
        meta: companyData.website,
      },
    ];
  }, [companyData]);

  const StatusBadge = ({ status }: { status: StatusType | string }) => {
    const styles: Record<string, string> = {
      valid: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      active: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      ready: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
      "in-progress": "bg-amber-500/10 text-amber-700 border border-amber-500/20",
      "on-track": "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      expired: "bg-red-500/10 text-red-700 border border-red-500/20",
      missing: "bg-slate-500/10 text-slate-700 border border-slate-500/20",
    };

    return (
      <Badge className={styles[status] || "bg-slate-500/10 text-slate-700 border border-slate-500/20"}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando información corporativa...
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-4 h-10 w-10 text-amber-500" />
            <p className="text-lg font-semibold">No hay empresa registrada</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Todavía no se encontró información corporativa en la base de datos para este usuario.
            </p>
            <Button className="mt-6 gap-2" onClick={() => refetch()}>
              <Plus className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Información Corporativa</h1>
            <p className="mt-1 text-muted-foreground">
              Gestiona datos legales, carrier packet, perfil de negocio, estrategia y documentos de la empresa.
            </p>
          </div>
        </div>

        <Button size="lg" className="gap-2">
          <Edit className="h-4 w-4" />
          Editar Información
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
              <p className="font-semibold">{companyData.legalName}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Carrier Packet</p>
              <p className="font-semibold">{packetCompletion}% completo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Operación</p>
              <p className="font-semibold">{companyData.operationType}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <CalendarDays className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Compliance</p>
              <p className="font-semibold capitalize">{companyData.complianceStatus}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="carrier-packet">Carrier Packet</TabsTrigger>
          <TabsTrigger value="business-profile">Perfil de Negocio</TabsTrigger>
          <TabsTrigger value="strategy">Estrategia</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumen Corporativo</CardTitle>
                <CardDescription>
                  Información principal de la empresa y su perfil operativo.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre Legal</p>
                    <p className="font-semibold">{companyData.legalName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Operación</p>
                    <p className="font-semibold">{companyData.operationType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="font-semibold">{companyData.website}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Flota</p>
                    <Badge variant="secondary">{businessProfile?.fleetType || "—"}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dirección</p>
                      <p className="font-semibold text-sm">{companyData.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <p className="font-semibold">{companyData.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold">{companyData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Descripción</p>
                      <p className="font-semibold text-sm">{companyData.description}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner / Contacto Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-semibold">{companyData.owner.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="font-semibold">{companyData.owner.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{companyData.owner.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">DOT Number</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{companyData.dot}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">MC Number</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{companyData.mc}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Insurance Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{companyData.insuranceProvider}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Insurance Expiry</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatDate(companyData.insuranceExpiryDate)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="carrier-packet" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Carrier Packet</CardTitle>
              <CardDescription>
                Documentos regulatorios y de presentación comercial construidos desde la data real de la empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Estado del packet</p>
                  <p className="text-sm font-semibold">{packetCompletion}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${packetCompletion}%` }} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {carrierPacket.map((item) => (
                  <Card key={item.key} className="border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <StatusBadge status={item.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{item.extraLabel}</p>
                        <p className="font-semibold">{item.extraValue || "—"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="font-semibold">{item.expiresAt ? formatDate(item.expiresAt) : "—"}</p>
                      </div>

                      <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                        <Download className="h-4 w-4" />
                        Disponible pronto
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-profile" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Equipamiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessProfile?.equipment.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipos de Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessProfile?.serviceTypes.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Áreas de Cobertura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessProfile?.coverageAreas.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rutas Preferidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {businessProfile?.preferredLanes.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Objetivos Estratégicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strategy.goals.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{item.goal}</p>
                      <p className="text-xs text-muted-foreground">Timeline: {item.timeline}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan de Crecimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm leading-6">{strategy.growth_plan}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(strategy.kpis).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Repositorio de Documentos</CardTitle>
                <CardDescription>
                  Vista consolidada de los documentos derivados de la información corporativa disponible.
                </CardDescription>
              </div>
              <Button className="gap-2" disabled>
                <Plus className="h-4 w-4" />
                Agregar Documento
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <p className="font-semibold">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="text-left md:text-right">
                      <StatusBadge status={doc.status} />
                      <p className="mt-1 text-xs text-muted-foreground">{doc.meta}</p>
                    </div>

                    <Button variant="outline" size="sm" className="gap-2" disabled>
                      <Download className="h-4 w-4" />
                      Próximamente
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
