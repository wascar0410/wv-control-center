import { useState } from "react";
import { useNavigate } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Edit2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompanyManagement() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    dotNumber: "",
    mcNumber: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    logoUrl: "",
    description: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    complianceStatus: "active" as const,
  });

  const { data: companies = [], isLoading, refetch } = trpc.company.getAll.useQuery();
  const createMutation = trpc.company.create.useMutation();
  const updateMutation = trpc.company.update.useMutation();
  const deleteMutation = trpc.company.delete.useMutation();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      setFormData({
        name: "",
        dotNumber: "",
        mcNumber: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        logoUrl: "",
        description: "",
        insuranceProvider: "",
        insurancePolicyNumber: "",
        complianceStatus: "active",
      });
      setIsCreateOpen(false);
      refetch();
    } catch (error) {
      console.error("Error creating company:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta empresa?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        refetch();
      } catch (error) {
        console.error("Error deleting company:", error);
      }
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Empresas</h1>
          <p className="text-gray-600 mt-2">Administra tus empresas (carriers) y su información</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Empresa</DialogTitle>
              <DialogDescription>Ingresa la información de tu empresa (carrier)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de Empresa *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Mi Carrier Inc"
                  />
                </div>
                <div>
                  <Label>DOT Number</Label>
                  <Input
                    value={formData.dotNumber}
                    onChange={(e) => setFormData({ ...formData, dotNumber: e.target.value })}
                    placeholder="Ej: 1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>MC Number</Label>
                  <Input
                    value={formData.mcNumber}
                    onChange={(e) => setFormData({ ...formData, mcNumber: e.target.value })}
                    placeholder="Ej: 123456"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="empresa@example.com"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label>Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </div>

              {/* Insurance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proveedor de Seguros</Label>
                  <Input
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    placeholder="Ej: Progressive"
                  />
                </div>
                <div>
                  <Label>Número de Póliza</Label>
                  <Input
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                    placeholder="POL-123456"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Información adicional sobre tu empresa"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Empresa"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando empresas...</p>
        </div>
      ) : companies.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes empresas creadas. Crea una nueva empresa para comenzar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {companies.map((company: any) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {company.name}
                      <Badge className={getComplianceColor(company.complianceStatus)}>
                        {company.complianceStatus === "active"
                          ? "Activa"
                          : company.complianceStatus === "suspended"
                            ? "Suspendida"
                            : "Inactiva"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{company.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(company.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {company.dotNumber && (
                    <div>
                      <p className="text-gray-600">DOT Number</p>
                      <p className="font-semibold">{company.dotNumber}</p>
                    </div>
                  )}
                  {company.mcNumber && (
                    <div>
                      <p className="text-gray-600">MC Number</p>
                      <p className="font-semibold">{company.mcNumber}</p>
                    </div>
                  )}
                  {company.email && (
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-semibold">{company.email}</p>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <p className="text-gray-600">Teléfono</p>
                      <p className="font-semibold">{company.phone}</p>
                    </div>
                  )}
                  {company.city && (
                    <div>
                      <p className="text-gray-600">Ubicación</p>
                      <p className="font-semibold">
                        {company.city}, {company.state}
                      </p>
                    </div>
                  )}
                  {company.insuranceProvider && (
                    <div>
                      <p className="text-gray-600">Seguro</p>
                      <p className="font-semibold">{company.insuranceProvider}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
