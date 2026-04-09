"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Settings, Lock, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bio: string;
};

const EMPTY_PROFILE: ProfileForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  bio: "",
};

export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const { data, isLoading, error } = trpc.profile.getProfile.useQuery(undefined, {
    retry: false,
  });

  const profile = useMemo<ProfileForm>(() => {
    return {
      name: data?.profile?.name ?? user?.name ?? "",
      phone: data?.profile?.phone ?? "",
      address: data?.profile?.address ?? "",
      city: data?.profile?.city ?? "",
      state: data?.profile?.state ?? "",
      zipCode: data?.profile?.zipCode ?? "",
      bio: data?.profile?.bio ?? "",
    };
  }, [data, user]);

  const [form, setForm] = useState<ProfileForm>(profile);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const hasAuthIssue = !!error;
  const userInitial = (form.name || user?.name || "U").charAt(0).toUpperCase();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando perfil...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
            {userInitial}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra tu información personal, preferencias y datos de seguridad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button disabled>
            Guardado desactivado
          </Button>
        </div>
      </div>

      {hasAuthIssue && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Datos no disponibles temporalmente</p>
              <p className="text-sm text-muted-foreground">
                No se pudo cargar toda la información del perfil. Se están usando valores seguros mientras se estabiliza la autenticación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre</p>
              <p className="font-semibold">{form.name || "Sin nombre"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="font-semibold">{user?.email || "No disponible"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Teléfono</p>
              <p className="font-semibold">{form.phone || "Sin teléfono"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rol</p>
              <p className="font-semibold capitalize">{user?.role || "No disponible"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 md:grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferencias
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información personal</CardTitle>
              <CardDescription>
                Revisa y prepara tus datos básicos para futuras actualizaciones del perfil.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Teléfono"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Dirección</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Dirección"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ciudad</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Ciudad"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="Estado"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zip Code</label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                    placeholder="Zip Code"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Bio</label>
                  <Input
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Cuéntanos algo sobre ti"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled>
                  Guardado desactivado (auth pendiente)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setForm(profile)}
                >
                  Restablecer cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>
                Esta sección quedará lista para tema, idioma, notificaciones y ajustes de experiencia.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-medium">Configuración temporalmente desactivada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Las preferencias todavía no están habilitadas en esta versión, pero el módulo ya está preparado para integrarlas sin rehacer la vista.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">Tema</p>
                    <p className="mt-1 text-sm text-muted-foreground">Pendiente</p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">Notificaciones</p>
                    <p className="mt-1 text-sm text-muted-foreground">Pendiente</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>
                Información básica de sesión y cuenta.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuario</p>
                  <p className="mt-1 font-semibold">{user?.email || "No disponible"}</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rol</p>
                  <p className="mt-1 font-semibold capitalize">{user?.role || "No disponible"}</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Método</p>
                  <p className="mt-1 font-semibold">Autenticación protegida</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                  <p className="mt-1 font-semibold">
                    {hasAuthIssue ? "Sesión parcial" : "Sesión activa"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-medium">Cambios de seguridad</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  El cambio de contraseña y controles avanzados pueden agregarse aquí cuando termines de estabilizar auth y sesiones.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
