/**
 * UserManagement.tsx — WV Control Center
 * Allows owners/admins to view all users and update their roles.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, Truck, Crown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  driver: "Chofer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  driver: "bg-green-100 text-green-800 border-green-200",
};

const ROLE_ICONS: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  driver: Truck,
};

export default function UserManagement() {
  const { data: users = [], isLoading, refetch } = trpc.admin.listAllUsers.useQuery();
  const [pendingRoles, setPendingRoles] = useState<Record<number, string>>({});

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPendingRoles({});
      refetch();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    setPendingRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSave = (userId: number) => {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    updateRole.mutate({ userId, role: newRole as "owner" | "admin" | "driver" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los roles y permisos de los usuarios del sistema
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* Role Legend */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Niveles de Acceso</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Propietario</p>
                <p className="text-xs text-muted-foreground">Acceso total, gestión de roles, finanzas completas</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Administrador</p>
                <p className="text-xs text-muted-foreground">Gestión operativa, cargas, choferes</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Chofer</p>
                <p className="text-xs text-muted-foreground">Solo vista de chofer, cargas asignadas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Usuarios Registrados ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay usuarios registrados</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => {
                const currentRole = pendingRoles[user.id] ?? user.role ?? "driver";
                const hasPendingChange = pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role;
                const RoleIcon = ROLE_ICONS[currentRole] ?? Users;

                return (
                  <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(user.name || user.email || "?")[0].toUpperCase()}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.name || "Sin nombre"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.lastSignedIn && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Último acceso: {new Date(user.lastSignedIn).toLocaleDateString("es-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {/* Current Role Badge */}
                    <Badge className={`shrink-0 border text-xs font-medium gap-1 ${ROLE_COLORS[user.role ?? "driver"]}`}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[user.role ?? "driver"]}
                    </Badge>

                    {/* Role Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={currentRole}
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">
                            <span className="flex items-center gap-1.5">
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              Propietario
                            </span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-blue-600" />
                              Administrador
                            </span>
                          </SelectItem>
                          <SelectItem value="driver">
                            <span className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-green-600" />
                              Chofer
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        className="h-8 text-xs px-3"
                        disabled={!hasPendingChange || updateRole.isPending}
                        onClick={() => handleSave(user.id)}
                        variant={hasPendingChange ? "default" : "outline"}
                      >
                        {updateRole.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Nota importante</p>
        <p className="text-xs">
          Los cambios de rol toman efecto en el próximo inicio de sesión del usuario.
          Si el usuario ya está logueado, debe cerrar sesión y volver a entrar para que los cambios apliquen.
        </p>
      </div>
    </div>
  );
}
