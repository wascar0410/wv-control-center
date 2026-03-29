import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface Contact {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  status: "new" | "read" | "responded" | "archived";
  createdAt: Date;
}

interface ContactsTableProps {
  contacts: Contact[];
  onViewDetails: (contact: Contact) => void;
  isLoading?: boolean;
}

type SortField = "date" | "name" | "status";
type SortOrder = "asc" | "desc";

const statusColors: Record<string, string> = {
  new: "bg-red-100 text-red-800",
  read: "bg-yellow-100 text-yellow-800",
  responded: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  new: "Nueva",
  read: "Leída",
  responded: "Respondida",
  archived: "Archivada",
};

export function ContactsTable({
  contacts,
  onViewDetails,
  isLoading,
}: ContactsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || contact.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [contacts, searchTerm, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="new">Nueva</SelectItem>
            <SelectItem value="read">Leída</SelectItem>
            <SelectItem value="responded">Respondida</SelectItem>
            <SelectItem value="archived">Archivada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                Fecha <SortIcon field="date" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Nombre <SortIcon field="name" />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                Estado <SortIcon field="status" />
              </TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No hay solicitudes que coincidan con los filtros
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedContacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-gray-50">
                  <TableCell className="text-sm">
                    {new Date(contact.createdAt).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {contact.email}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {contact.company || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[contact.status]}>
                      {statusLabels[contact.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(contact)}
                    >
                      Ver detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredAndSortedContacts.length} de {contacts.length} solicitudes
      </div>
    </div>
  );
}
