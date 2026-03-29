import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ContactsTable } from "@/components/ContactsTable";
import { ContactDetailModal } from "@/components/ContactDetailModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail } from "lucide-react";

interface Contact {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  status: "new" | "read" | "responded" | "archived";
  createdAt: Date;
}

export function AdminContacts() {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check authorization
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No tienes permiso para acceder a esta página
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch contacts
  const { data: contacts = [], isLoading, refetch } = trpc.contact.list.useQuery(
    {}
  );

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleStatusUpdated = () => {
    refetch();
  };

  // Calculate stats
  const stats = {
    total: contacts.length,
    new: contacts.filter((c: Contact) => c.status === "new").length,
    responded: contacts.filter((c: Contact) => c.status === "responded").length,
    archived: contacts.filter((c: Contact) => c.status === "archived").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="w-8 h-8 text-blue-600" />
          Gestión de Contactos
        </h1>
        <p className="text-gray-600 mt-2">
          Administra y responde a las solicitudes de contacto de clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">
              Nuevas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">
              Respondidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.responded}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Archivadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {stats.archived}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Contacto</CardTitle>
          <CardDescription>
            Filtra, busca y gestiona todas las solicitudes de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactsTable
            contacts={contacts}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContact(null);
        }}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
