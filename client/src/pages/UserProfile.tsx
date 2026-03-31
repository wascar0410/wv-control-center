"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Settings, Lock } from "lucide-react";

export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // 🔥 query segura
  const { data, isLoading, error } = trpc.profile.getProfile.useQuery(undefined, {
    retry: false,
  });

  const profile = data?.profile ?? {
    name: user?.name ?? "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    bio: "",
  };

  const [form, setForm] = useState(profile);

  useEffect(() => {
    setForm(profile);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      {error && (
        <div className="text-sm text-red-400">
          Datos no disponibles (auth pendiente)
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Nombre"
              />
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="Teléfono"
              />
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Dirección"
              />

              <Button disabled>
                Guardado desactivado (auth pendiente)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferencias */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuración desactivada temporalmente
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguridad */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Usuario: {user?.email}
              </p>
              <p className="text-muted-foreground">
                Rol: {user?.role}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
