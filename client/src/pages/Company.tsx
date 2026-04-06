import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Briefcase, TrendingUp, Lock, Download, Plus, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Company() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Mock company data
  const companyData = {
    name: "WV Transport Solutions",
    legalName: "WV Transport Solutions LLC",
    dot: "DOT-4567890",
    mc: "MC-1234567",
    address: "123 Main Street, Denver, CO 80202",
    phone: "+1 (303) 555-0123",
    email: "info@wvtransports.com",
    owner: {
      name: "John Doe",
      title: "Owner/Operator",
      email: "john@wvtransports.com",
    },
    operationType: "For-Hire Carrier",
    established: "2020",
  };

  const carrierPacket = {
    w9: { status: "valid", expiresAt: "2025-12-31" },
    insurance: { status: "active", expiresAt: "2025-06-30", coverage: "$1,000,000" },
    authority: { status: "active", expiresAt: "2026-12-31" },
    mc_dot: { status: "valid", expiresAt: "2025-12-31" },
    profile_pdf: { status: "ready", lastUpdated: "2026-04-01" },
  };

  const businessProfile = {
    fleetType: "Dry Van",
    equipment: ["53ft Dry Van", "48ft Dry Van", "Reefer Unit"],
    serviceTypes: ["Full Truckload", "Partial Load", "Expedited"],
    coverageAreas: ["Continental US", "Canada", "Mexico"],
    preferredLanes: ["Denver to LA", "Denver to Chicago", "Denver to Dallas"],
  };

  const strategy = {
    goals: [
      { goal: "Expand fleet to 50 units", timeline: "2026", status: "in-progress" },
      { goal: "Increase revenue by 40%", timeline: "2026", status: "in-progress" },
      { goal: "Achieve 95% on-time delivery", timeline: "2026", status: "on-track" },
    ],
    kpis: {
      revenue_target: "$5M",
      profit_margin: "12%",
      fleet_utilization: "85%",
      driver_retention: "90%",
    },
    growth_plan: "Focus on regional expansion and technology adoption",
  };

  const documents = [
    { name: "Operating Authority", type: "Legal", status: "valid", expiresAt: "2025-12-31" },
    { name: "Insurance Certificate", type: "Insurance", status: "active", expiresAt: "2025-06-30" },
    { name: "W-9 Form", type: "Tax", status: "valid", expiresAt: "2025-12-31" },
    { name: "Lease Agreements", type: "Contracts", status: "active", expiresAt: "2026-06-30" },
    { name: "Driver Contracts", type: "HR", status: "active", expiresAt: "Ongoing" },
  ];

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      valid: "bg-green-100 text-green-800",
      active: "bg-green-100 text-green-800",
      "in-progress": "bg-blue-100 text-blue-800",
      "on-track": "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Información Corporativa</h1>
          <p className="text-muted-foreground">Gestiona datos legales, documentos y perfil de la empresa</p>
        </div>
        <Button size="lg" className="gap-2">
          <Edit className="w-4 h-4" />
          Editar Información
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="carrier-packet">Carrier Packet</TabsTrigger>
          <TabsTrigger value="business-profile">Perfil de Negocio</TabsTrigger>
          <TabsTrigger value="strategy">Estrategia</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre Legal</p>
                  <p className="font-semibold">{companyData.legalName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Operación</p>
                  <p className="font-semibold">{companyData.operationType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Establecida</p>
                  <p className="font-semibold">{companyData.established}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-semibold text-sm">{companyData.address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Regulatory Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información Regulatoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">DOT Number</p>
                  <p className="font-semibold">{companyData.dot}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MC Number</p>
                  <p className="font-semibold">{companyData.mc}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-semibold">{companyData.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{companyData.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Owner Info */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Información del Propietario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <p className="font-semibold">{companyData.owner.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: CARRIER PACKET */}
        <TabsContent value="carrier-packet" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(carrierPacket).map(([key, value]: [string, any]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{key.replace(/_/g, " ")}</CardTitle>
                    <StatusBadge status={value.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {value.expiresAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expira</p>
                      <p className="font-semibold">{value.expiresAt}</p>
                    </div>
                  )}
                  {value.coverage && (
                    <div>
                      <p className="text-xs text-muted-foreground">Cobertura</p>
                      <p className="font-semibold">{value.coverage}</p>
                    </div>
                  )}
                  {value.lastUpdated && (
                    <div>
                      <p className="text-xs text-muted-foreground">Última Actualización</p>
                      <p className="font-semibold">{value.lastUpdated}</p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full gap-2 mt-2">
                    <Download className="w-4 h-4" />
                    Descargar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: BUSINESS PROFILE */}
        <TabsContent value="business-profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {businessProfile.equipment.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipos de Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {businessProfile.serviceTypes.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Áreas de Cobertura</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {businessProfile.coverageAreas.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rutas Preferidas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {businessProfile.preferredLanes.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Tipo de Flota</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-blue-100 text-blue-800">{businessProfile.fleetType}</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: STRATEGY */}
        <TabsContent value="strategy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goals */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Objetivos Estratégicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategy.goals.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-semibold">{item.goal}</p>
                        <p className="text-xs text-muted-foreground">{item.timeline}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>KPIs Clave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(strategy.kpis).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="font-semibold text-lg">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Growth Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Plan de Crecimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{strategy.growth_plan}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: DOCUMENTS */}
        <TabsContent value="documents" className="space-y-4">
          <div className="space-y-2">
            {documents.map((doc, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <StatusBadge status={doc.status} />
                        <p className="text-xs text-muted-foreground mt-1">{doc.expiresAt}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Agregar Documento
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
