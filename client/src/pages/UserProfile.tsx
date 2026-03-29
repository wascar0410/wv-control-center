import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, User, Settings, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch profile data
  const { data: profileData, isLoading: isLoadingProfile } = trpc.profile.getProfile.useQuery();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    bio: "",
  });

  // Preferences form state
  const [preferencesForm, setPreferencesForm] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    notifyOnLoadAssignment: true,
    notifyOnLoadStatus: true,
    notifyOnPayment: true,
    notifyOnMessage: true,
    notifyOnBonus: true,
    theme: "dark" as "dark" | "light" | "auto",
    language: "es",
    timezone: "America/New_York",
    showOnlineStatus: true,
    allowLocationTracking: false,
  });

  // Mutations
  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado", {
        description: "Tu información de perfil ha sido guardada correctamente.",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar el perfil",
      });
    },
  });

  const updatePreferencesMutation = trpc.profile.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferencias actualizadas", {
        description: "Tus preferencias han sido guardadas correctamente.",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudieron actualizar las preferencias",
      });
    },
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profileData?.profile) {
      setProfileForm({
        name: profileData.profile.name || "",
        phone: profileData.profile.phone || "",
        address: profileData.profile.address || "",
        city: profileData.profile.city || "",
        state: profileData.profile.state || "",
        zipCode: profileData.profile.zipCode || "",
        bio: profileData.profile.bio || "",
      });
    }

    if (profileData?.preferences) {
      setPreferencesForm({
        emailNotifications: profileData.preferences.emailNotifications ?? true,
        smsNotifications: profileData.preferences.smsNotifications ?? true,
        pushNotifications: profileData.preferences.pushNotifications ?? true,
        notifyOnLoadAssignment: profileData.preferences.notifyOnLoadAssignment ?? true,
        notifyOnLoadStatus: profileData.preferences.notifyOnLoadStatus ?? true,
        notifyOnPayment: profileData.preferences.notifyOnPayment ?? true,
        notifyOnMessage: profileData.preferences.notifyOnMessage ?? true,
        notifyOnBonus: profileData.preferences.notifyOnBonus ?? true,
        theme: profileData.preferences.theme ?? "dark",
        language: profileData.preferences.language ?? "es",
        timezone: profileData.preferences.timezone ?? "America/New_York",
        showOnlineStatus: profileData.preferences.showOnlineStatus ?? true,
        allowLocationTracking: profileData.preferences.allowLocationTracking ?? false,
      });
    }
  }, [profileData]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: any) => {
    setPreferencesForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    await updateProfileMutation.mutateAsync(profileForm);
  };

  const handleSavePreferences = async () => {
    await updatePreferencesMutation.mutateAsync(preferencesForm);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal y preferencias del sistema</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferencias</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información de contacto y perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    placeholder="Tu nombre completo"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) => handleProfileChange("bio", e.target.value)}
                    placeholder="Cuéntanos sobre ti..."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={profileForm.address}
                    onChange={(e) => handleProfileChange("address", e.target.value)}
                    placeholder="Tu dirección completa"
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={profileForm.city}
                      onChange={(e) => handleProfileChange("city", e.target.value)}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={profileForm.state}
                      onChange={(e) => handleProfileChange("state", e.target.value)}
                      placeholder="Estado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Código Postal</Label>
                    <Input
                      id="zipCode"
                      value={profileForm.zipCode}
                      onChange={(e) => handleProfileChange("zipCode", e.target.value)}
                      placeholder="Código Postal"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Controla cómo deseas recibir notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">Canales de Notificación</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="emailNotifications"
                      checked={preferencesForm.emailNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
                    />
                    <Label htmlFor="emailNotifications" className="font-normal cursor-pointer">
                      Notificaciones por Correo Electrónico
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="smsNotifications"
                      checked={preferencesForm.smsNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange("smsNotifications", checked)}
                    />
                    <Label htmlFor="smsNotifications" className="font-normal cursor-pointer">
                      Notificaciones por SMS
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pushNotifications"
                      checked={preferencesForm.pushNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange("pushNotifications", checked)}
                    />
                    <Label htmlFor="pushNotifications" className="font-normal cursor-pointer">
                      Notificaciones Push del Navegador
                    </Label>
                  </div>
                </div>

                {/* Notification Types */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm text-foreground">Tipos de Notificaciones</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyOnLoadAssignment"
                      checked={preferencesForm.notifyOnLoadAssignment}
                      onCheckedChange={(checked) => handlePreferenceChange("notifyOnLoadAssignment", checked)}
                    />
                    <Label htmlFor="notifyOnLoadAssignment" className="font-normal cursor-pointer">
                      Nuevas Asignaciones de Cargas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyOnLoadStatus"
                      checked={preferencesForm.notifyOnLoadStatus}
                      onCheckedChange={(checked) => handlePreferenceChange("notifyOnLoadStatus", checked)}
                    />
                    <Label htmlFor="notifyOnLoadStatus" className="font-normal cursor-pointer">
                      Cambios de Estado de Cargas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyOnPayment"
                      checked={preferencesForm.notifyOnPayment}
                      onCheckedChange={(checked) => handlePreferenceChange("notifyOnPayment", checked)}
                    />
                    <Label htmlFor="notifyOnPayment" className="font-normal cursor-pointer">
                      Notificaciones de Pagos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyOnMessage"
                      checked={preferencesForm.notifyOnMessage}
                      onCheckedChange={(checked) => handlePreferenceChange("notifyOnMessage", checked)}
                    />
                    <Label htmlFor="notifyOnMessage" className="font-normal cursor-pointer">
                      Nuevos Mensajes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyOnBonus"
                      checked={preferencesForm.notifyOnBonus}
                      onCheckedChange={(checked) => handlePreferenceChange("notifyOnBonus", checked)}
                    />
                    <Label htmlFor="notifyOnBonus" className="font-normal cursor-pointer">
                      Bonificaciones y Incentivos
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Preferencias del Sistema</CardTitle>
                <CardDescription>Personaliza tu experiencia en la aplicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme */}
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select value={preferencesForm.theme} onValueChange={(value) => handlePreferenceChange("theme", value)}>
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="auto">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={preferencesForm.language} onValueChange={(value) => handlePreferenceChange("language", value)}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select value={preferencesForm.timezone} onValueChange={(value) => handlePreferenceChange("timezone", value)}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Este (EST)</SelectItem>
                      <SelectItem value="America/Chicago">Central (CST)</SelectItem>
                      <SelectItem value="America/Denver">Montaña (MST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacífico (PST)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska (AKST)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawái (HST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Privacy */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm text-foreground">Privacidad</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showOnlineStatus"
                      checked={preferencesForm.showOnlineStatus}
                      onCheckedChange={(checked) => handlePreferenceChange("showOnlineStatus", checked)}
                    />
                    <Label htmlFor="showOnlineStatus" className="font-normal cursor-pointer">
                      Mostrar mi estado en línea
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowLocationTracking"
                      checked={preferencesForm.allowLocationTracking}
                      onCheckedChange={(checked) => handlePreferenceChange("allowLocationTracking", checked)}
                    />
                    <Label htmlFor="allowLocationTracking" className="font-normal cursor-pointer">
                      Permitir rastreo de ubicación en tiempo real
                    </Label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSavePreferences}
                    disabled={updatePreferencesMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updatePreferencesMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Gestiona la seguridad de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Información de Cuenta</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Correo:</strong> {user?.email}</p>
                    <p><strong>Rol:</strong> {user?.role === "owner" ? "Propietario" : user?.role === "admin" ? "Administrador" : "Chofer"}</p>
                    <p><strong>Método de Acceso:</strong> OAuth (Manus)</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Tu contraseña se gestiona a través de tu cuenta de Manus. Para cambiar tu contraseña, accede a tu perfil en la plataforma Manus.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
