import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  User,
  Settings,
  Lock,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ThemeMode = "dark" | "light" | "auto";

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bio: string;
  profileImageUrl: string;
};

type PreferencesForm = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notifyOnLoadAssignment: boolean;
  notifyOnLoadStatus: boolean;
  notifyOnPayment: boolean;
  notifyOnMessage: boolean;
  notifyOnBonus: boolean;
  theme: ThemeMode;
  language: string;
  timezone: string;
  showOnlineStatus: boolean;
  allowLocationTracking: boolean;
};

type VehicleForm = {
  type: "cargo_van" | "sprinter" | "box_truck" | "pickup" | "other" | "";
  name: string;
  plate: string;
  year: string;
  make: string;
  model: string;
  weightCapacity: string;
  fuelCostPerMile: string;
  maintenanceCostPerMile: string;
  availableForLoads: boolean;
};

const DEFAULT_PROFILE: ProfileForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  bio: "",
  profileImageUrl: "",
};

const DEFAULT_PREFERENCES: PreferencesForm = {
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true,
  notifyOnLoadAssignment: true,
  notifyOnLoadStatus: true,
  notifyOnPayment: true,
  notifyOnMessage: true,
  notifyOnBonus: true,
  theme: "dark",
  language: "es",
  timezone: "America/New_York",
  showOnlineStatus: true,
  allowLocationTracking: false,
};

const DEFAULT_VEHICLE: VehicleForm = {
  type: "",
  name: "",
  plate: "",
  year: "",
  make: "",
  model: "",
  weightCapacity: "",
  fuelCostPerMile: "0.22",
  maintenanceCostPerMile: "0.12",
  availableForLoads: true,
};

export default function UserProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("profile");
  const [profileForm, setProfileForm] = useState<ProfileForm>(DEFAULT_PROFILE);
  const [preferencesForm, setPreferencesForm] =
    useState<PreferencesForm>(DEFAULT_PREFERENCES);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(DEFAULT_VEHICLE);
  const [avatarImageError, setAvatarImageError] = useState(false);

  const {
    data: walletSummary,
    isLoading: walletLoading,
  } = trpc.wallet.getWalletSummary.useQuery(undefined, {
    retry: false,
  });

  const {
    data: profileData,
    isLoading,
    error,
  } = trpc.profile.getProfile.useQuery(undefined, {
    retry: false,
  });

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil actualizado", {
        description: "Tu información de perfil ha sido guardada correctamente.",
      });
      await utils.profile.getProfile.invalidate();
    },
    onError: (err) => {
      toast.error("Error al guardar perfil", {
        description: err.message || "No se pudo actualizar el perfil.",
      });
    },
  });

  const updateVehicleMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Vehículo guardado", {
        description: "La información de tu vehículo ha sido guardada correctamente.",
      });
      await utils.profile.getProfile.invalidate();
    },
    onError: (err) => {
      toast.error("Error al guardar vehículo", {
        description: err.message || "No se pudo actualizar la información del vehículo.",
      });
    },
  });

  const updatePreferencesMutation = trpc.profile.updatePreferences.useMutation({
    onSuccess: async () => {
      toast.success("Preferencias actualizadas", {
        description: "Tus preferencias han sido guardadas correctamente.",
      });
      await utils.profile.getProfile.invalidate();
    },
    onError: (err) => {
      toast.error("Error al guardar preferencias", {
        description:
          err.message || "No se pudieron actualizar las preferencias.",
      });
    },
  });

  useEffect(() => {
    if (profileData?.profile) {
      setProfileForm({
        name: profileData.profile.name || user?.name || "",
        phone: profileData.profile.phone || "",
        address: profileData.profile.address || "",
        city: profileData.profile.city || "",
        state: profileData.profile.state || "",
        zipCode: profileData.profile.zipCode || "",
        bio: profileData.profile.bio || "",
        profileImageUrl: profileData.profile.profileImageUrl || "",
      });
      setAvatarImageError(false);
    } else if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
      }));
    }

    if (profileData?.preferences) {
      setPreferencesForm({
        emailNotifications: profileData.preferences.emailNotifications ?? true,
        smsNotifications: profileData.preferences.smsNotifications ?? true,
        pushNotifications: profileData.preferences.pushNotifications ?? true,
        notifyOnLoadAssignment:
          profileData.preferences.notifyOnLoadAssignment ?? true,
        notifyOnLoadStatus: profileData.preferences.notifyOnLoadStatus ?? true,
        notifyOnPayment: profileData.preferences.notifyOnPayment ?? true,
        notifyOnMessage: profileData.preferences.notifyOnMessage ?? true,
        notifyOnBonus: profileData.preferences.notifyOnBonus ?? true,
        theme: (profileData.preferences.theme as ThemeMode) ?? "dark",
        language: profileData.preferences.language ?? "es",
        timezone: profileData.preferences.timezone ?? "America/New_York",
        showOnlineStatus: profileData.preferences.showOnlineStatus ?? true,
        allowLocationTracking:
          profileData.preferences.allowLocationTracking ?? false,
      });
    }

    if (profileData?.profile?.vehicleInfo) {
      try {
        const vehicleData = JSON.parse(profileData.profile.vehicleInfo);
        setVehicleForm({
          type: vehicleData.type || "",
          name: vehicleData.name || "",
          plate: vehicleData.plate || "",
          year: vehicleData.year || "",
          make: vehicleData.make || "",
          model: vehicleData.model || "",
          weightCapacity: vehicleData.weightCapacity || "",
          fuelCostPerMile: vehicleData.fuelCostPerMile?.toString() || "0.22",
          maintenanceCostPerMile: vehicleData.maintenanceCostPerMile?.toString() || "0.12",
          availableForLoads: vehicleData.availableForLoads ?? true,
        });
      } catch (e) {
        setVehicleForm(DEFAULT_VEHICLE);
      }
    }
  }, [profileData, user]);

  const hasProfileChanges = useMemo(() => {
    const current = {
      name: profileData?.profile?.name || user?.name || "",
      phone: profileData?.profile?.phone || "",
      address: profileData?.profile?.address || "",
      city: profileData?.profile?.city || "",
      state: profileData?.profile?.state || "",
      zipCode: profileData?.profile?.zipCode || "",
      bio: profileData?.profile?.bio || "",
      profileImageUrl: profileData?.profile?.profileImageUrl || "",
    };

    return JSON.stringify(current) !== JSON.stringify(profileForm);
  }, [profileData, profileForm, user]);

  const hasPreferenceChanges = useMemo(() => {
    const current = {
      emailNotifications: profileData?.preferences?.emailNotifications ?? true,
      smsNotifications: profileData?.preferences?.smsNotifications ?? true,
      pushNotifications: profileData?.preferences?.pushNotifications ?? true,
      notifyOnLoadAssignment:
        profileData?.preferences?.notifyOnLoadAssignment ?? true,
      notifyOnLoadStatus: profileData?.preferences?.notifyOnLoadStatus ?? true,
      notifyOnPayment: profileData?.preferences?.notifyOnPayment ?? true,
      notifyOnMessage: profileData?.preferences?.notifyOnMessage ?? true,
      notifyOnBonus: profileData?.preferences?.notifyOnBonus ?? true,
      theme: (profileData?.preferences?.theme as ThemeMode) ?? "dark",
      language: profileData?.preferences?.language ?? "es",
      timezone: profileData?.preferences?.timezone ?? "America/New_York",
      showOnlineStatus: profileData?.preferences?.showOnlineStatus ?? true,
      allowLocationTracking:
        profileData?.preferences?.allowLocationTracking ?? false,
    };

    return JSON.stringify(current) !== JSON.stringify(preferencesForm);
  }, [profileData, preferencesForm]);

  const avatarFallback = (profileForm.name || user?.name || "U")
    .charAt(0)
    .toUpperCase();

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (field === "profileImageUrl") {
      setAvatarImageError(false);
    }
  };

  const handlePreferenceChange = <K extends keyof PreferencesForm>(
    field: K,
    value: PreferencesForm[K]
  ) => {
    setPreferencesForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    await updateProfileMutation.mutateAsync({
      name: profileForm.name,
      phone: profileForm.phone,
      address: profileForm.address,
      city: profileForm.city,
      state: profileForm.state,
      zipCode: profileForm.zipCode,
      bio: profileForm.bio,
      profileImageUrl: profileForm.profileImageUrl,
    });
  };

  const handleSavePreferences = async () => {
    await updatePreferencesMutation.mutateAsync(preferencesForm);
  };

  const handleVehicleChange = (field: keyof VehicleForm, value: string | boolean) => {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveVehicle = async () => {
    const fuelCost = parseFloat(vehicleForm.fuelCostPerMile) || 0;
    const maintenanceCost = parseFloat(vehicleForm.maintenanceCostPerMile) || 0;
    
    if (fuelCost < 0 || maintenanceCost < 0) {
      toast.error("Costos inválidos", {
        description: "Los costos no pueden ser negativos.",
      });
      return;
    }

    const vehicleData = {
      type: vehicleForm.type,
      name: vehicleForm.name,
      plate: vehicleForm.plate,
      year: vehicleForm.year,
      make: vehicleForm.make,
      model: vehicleForm.model,
      weightCapacity: vehicleForm.weightCapacity,
      fuelCostPerMile: fuelCost,
      maintenanceCostPerMile: maintenanceCost,
      availableForLoads: vehicleForm.availableForLoads,
    };

    await updateVehicleMutation.mutateAsync({
      vehicleInfo: JSON.stringify(vehicleData),
    });
  };

  const handleResetProfile = () => {
    setProfileForm({
      name: profileData?.profile?.name || user?.name || "",
      phone: profileData?.profile?.phone || "",
      address: profileData?.profile?.address || "",
      city: profileData?.profile?.city || "",
      state: profileData?.profile?.state || "",
      zipCode: profileData?.profile?.zipCode || "",
      bio: profileData?.profile?.bio || "",
      profileImageUrl: profileData?.profile?.profileImageUrl || "",
    });
    setAvatarImageError(false);
  };

  const handleResetPreferences = () => {
    setPreferencesForm({
      emailNotifications: profileData?.preferences?.emailNotifications ?? true,
      smsNotifications: profileData?.preferences?.smsNotifications ?? true,
      pushNotifications: profileData?.preferences?.pushNotifications ?? true,
      notifyOnLoadAssignment:
        profileData?.preferences?.notifyOnLoadAssignment ?? true,
      notifyOnLoadStatus: profileData?.preferences?.notifyOnLoadStatus ?? true,
      notifyOnPayment: profileData?.preferences?.notifyOnPayment ?? true,
      notifyOnMessage: profileData?.preferences?.notifyOnMessage ?? true,
      notifyOnBonus: profileData?.preferences?.notifyOnBonus ?? true,
      theme: (profileData?.preferences?.theme as ThemeMode) ?? "dark",
      language: profileData?.preferences?.language ?? "es",
      timezone: profileData?.preferences?.timezone ?? "America/New_York",
      showOnlineStatus: profileData?.preferences?.showOnlineStatus ?? true,
      allowLocationTracking:
        profileData?.preferences?.allowLocationTracking ?? false,
    });
  };

  const availableBalance = Number(walletSummary?.wallet?.availableBalance ?? 0);
  const pendingBalance = Number(walletSummary?.wallet?.pendingBalance ?? 0);
  const totalEarnings = Number(walletSummary?.wallet?.totalEarnings ?? 0);

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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
            <p className="mt-1 text-muted-foreground">
              Gestiona tu información personal, preferencias y visibilidad dentro
              del sistema.
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-300">
              No se pudo cargar todo el perfil correctamente. Puedes seguir
              editando, pero si notas datos inconsistentes revisamos el router de
              auth/profile.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Nombre
                </p>
                <p className="font-semibold text-foreground">
                  {profileForm.name || "Sin nombre"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Correo
                </p>
                <p className="font-semibold text-foreground">
                  {user?.email || "No disponible"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Teléfono
                </p>
                <p className="font-semibold text-foreground">
                  {profileForm.phone || "Sin teléfono"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rol
                </p>
                <p className="font-semibold capitalize text-foreground">
                  {user?.role || "No disponible"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Mi Wallet
            </CardTitle>
            <CardDescription>Resumen financiero personal</CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Disponible</p>
              <p className="text-xl font-bold">
                {walletLoading ? "..." : formatCurrency(availableBalance)}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-xl font-bold">
                {walletLoading ? "..." : formatCurrency(pendingBalance)}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total Ganado</p>
              <p className="text-xl font-bold">
                {walletLoading ? "..." : formatCurrency(totalEarnings)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferencias</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Vehículo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información personal</CardTitle>
                <CardDescription>
                  Actualiza tus datos de contacto y tu foto de perfil.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex flex-col items-center gap-3">
                    {profileForm.profileImageUrl && !avatarImageError ? (
                      <img
                        src={profileForm.profileImageUrl}
                        alt="Foto de perfil"
                        className="h-24 w-24 rounded-full border object-cover"
                        onError={() => setAvatarImageError(true)}
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                        {avatarFallback}
                      </div>
                    )}

                    <div className="text-center text-xs text-muted-foreground">
                      Foto por URL
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="profileImageUrl">URL de la foto</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="profileImageUrl"
                        value={profileForm.profileImageUrl}
                        onChange={(e) =>
                          handleProfileChange("profileImageUrl", e.target.value)
                        }
                        placeholder="https://..."
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Puedes pegar una URL pública de imagen. Más adelante se puede
                      conectar una subida real de archivos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) =>
                        handleProfileChange("name", e.target.value)
                      }
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) =>
                        handleProfileChange("phone", e.target.value)
                      }
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) =>
                        handleProfileChange("bio", e.target.value)
                      }
                      placeholder="Cuéntanos sobre ti..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) =>
                          handleProfileChange("address", e.target.value)
                        }
                        placeholder="Tu dirección completa"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={profileForm.city}
                      onChange={(e) =>
                        handleProfileChange("city", e.target.value)
                      }
                      placeholder="Ciudad"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={profileForm.state}
                      onChange={(e) =>
                        handleProfileChange("state", e.target.value)
                      }
                      placeholder="Estado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Código postal</Label>
                    <Input
                      id="zipCode"
                      value={profileForm.zipCode}
                      onChange={(e) =>
                        handleProfileChange("zipCode", e.target.value)
                      }
                      placeholder="Código postal"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={
                      updateProfileMutation.isPending || !hasProfileChanges
                    }
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar perfil
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResetProfile}
                    disabled={
                      updateProfileMutation.isPending || !hasProfileChanges
                    }
                  >
                    Restablecer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>
                  Controla cómo y cuándo deseas recibir avisos.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Canales
                  </h3>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="emailNotifications"
                      checked={preferencesForm.emailNotifications}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange(
                          "emailNotifications",
                          Boolean(checked)
                        )
                      }
                    />
                    <Label
                      htmlFor="emailNotifications"
                      className="cursor-pointer font-normal"
                    >
                      Notificaciones por correo electrónico
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="smsNotifications"
                      checked={preferencesForm.smsNotifications}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange(
                          "smsNotifications",
                          Boolean(checked)
                        )
                      }
                    />
                    <Label
                      htmlFor="smsNotifications"
                      className="cursor-pointer font-normal"
                    >
                      Notificaciones por SMS
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pushNotifications"
                      checked={preferencesForm.pushNotifications}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange(
                          "pushNotifications",
                          Boolean(checked)
                        )
                      }
                    />
                    <Label
                      htmlFor="pushNotifications"
                      className="cursor-pointer font-normal"
                    >
                      Notificaciones push del navegador
                    </Label>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Tipos
                  </h3>

                  {[
                    ["notifyOnLoadAssignment", "Nuevas asignaciones de cargas"],
                    ["notifyOnLoadStatus", "Cambios de estado de cargas"],
                    ["notifyOnPayment", "Pagos"],
                    ["notifyOnMessage", "Mensajes"],
                    ["notifyOnBonus", "Bonificaciones"],
                  ].map(([field, label]) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field}
                        checked={Boolean(
                          preferencesForm[field as keyof PreferencesForm]
                        )}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange(
                            field as keyof PreferencesForm,
                            Boolean(checked) as never
                          )
                        }
                      />
                      <Label
                        htmlFor={field}
                        className="cursor-pointer font-normal"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferencias del sistema</CardTitle>
                <CardDescription>Personaliza tu experiencia.</CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={preferencesForm.theme}
                    onValueChange={(value: ThemeMode) =>
                      handlePreferenceChange("theme", value)
                    }
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={preferencesForm.language}
                    onValueChange={(value) =>
                      handlePreferenceChange("language", value)
                    }
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <Select
                    value={preferencesForm.timezone}
                    onValueChange={(value) =>
                      handlePreferenceChange("timezone", value)
                    }
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        America/New_York
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        America/Chicago
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        America/Denver
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        America/Los_Angeles
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="showOnlineStatus"
                    checked={preferencesForm.showOnlineStatus}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange(
                        "showOnlineStatus",
                        Boolean(checked)
                      )
                    }
                  />
                  <Label
                    htmlFor="showOnlineStatus"
                    className="cursor-pointer font-normal"
                  >
                    Mostrar mi estado en línea
                  </Label>
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="allowLocationTracking"
                    checked={preferencesForm.allowLocationTracking}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange(
                        "allowLocationTracking",
                        Boolean(checked)
                      )
                    }
                  />
                  <Label
                    htmlFor="allowLocationTracking"
                    className="cursor-pointer font-normal"
                  >
                    Permitir rastreo de ubicación en tiempo real
                  </Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSavePreferences}
                disabled={
                  updatePreferencesMutation.isPending || !hasPreferenceChanges
                }
              >
                {updatePreferencesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar preferencias
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleResetPreferences}
                disabled={
                  updatePreferencesMutation.isPending || !hasPreferenceChanges
                }
              >
                Restablecer
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>
                  Controla el acceso a tu cuenta
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Correo</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Rol</p>
                  <p className="text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      window.location.href = "/forgot-password";
                    }}
                  >
                    Cambiar contraseña
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Se enviará un enlace seguro a tu correo para actualizar tu
                    contraseña.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Vehículo</CardTitle>
                <CardDescription>
                  Configura los datos de tu vehículo para cálculos de costos precisos
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">Tipo de Vehículo *</Label>
                    <Select
                      value={vehicleForm.type}
                      onValueChange={(value) => handleVehicleChange("type", value)}
                    >
                      <SelectTrigger id="vehicle-type">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cargo_van">Cargo Van</SelectItem>
                        <SelectItem value="sprinter">Sprinter</SelectItem>
                        <SelectItem value="box_truck">Box Truck</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-name">Nombre/Alias</Label>
                    <Input
                      id="vehicle-name"
                      placeholder="Mi Vehículo"
                      value={vehicleForm.name}
                      onChange={(e) => handleVehicleChange("name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-plate">Placa</Label>
                    <Input
                      id="vehicle-plate"
                      placeholder="ABC-123"
                      value={vehicleForm.plate}
                      onChange={(e) => handleVehicleChange("plate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-year">Año</Label>
                    <Input
                      id="vehicle-year"
                      placeholder="2023"
                      value={vehicleForm.year}
                      onChange={(e) => handleVehicleChange("year", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-make">Marca</Label>
                    <Input
                      id="vehicle-make"
                      placeholder="Ford"
                      value={vehicleForm.make}
                      onChange={(e) => handleVehicleChange("make", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-model">Modelo</Label>
                    <Input
                      id="vehicle-model"
                      placeholder="Transit"
                      value={vehicleForm.model}
                      onChange={(e) => handleVehicleChange("model", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-capacity">Capacidad de Peso (lbs)</Label>
                    <Input
                      id="vehicle-capacity"
                      placeholder="5000"
                      value={vehicleForm.weightCapacity}
                      onChange={(e) => handleVehicleChange("weightCapacity", e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Costos Operacionales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuel-cost">Combustible por Milla ($)</Label>
                      <Input
                        id="fuel-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.22"
                        value={vehicleForm.fuelCostPerMile}
                        onChange={(e) => handleVehicleChange("fuelCostPerMile", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maintenance-cost">Mantenimiento por Milla ($)</Label>
                      <Input
                        id="maintenance-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.12"
                        value={vehicleForm.maintenanceCostPerMile}
                        onChange={(e) => handleVehicleChange("maintenanceCostPerMile", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total por Milla</Label>
                      <div className="rounded-md border bg-muted p-3 flex items-center justify-center">
                        <span className="text-lg font-semibold">
                          ${(parseFloat(vehicleForm.fuelCostPerMile) || 0 + parseFloat(vehicleForm.maintenanceCostPerMile) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="available-loads"
                    checked={vehicleForm.availableForLoads}
                    onCheckedChange={(checked) => handleVehicleChange("availableForLoads", checked as boolean)}
                  />
                  <Label htmlFor="available-loads" className="font-normal cursor-pointer">
                    Disponible para cargas
                  </Label>
                </div>
              </CardContent>

              <div className="border-t px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setVehicleForm(DEFAULT_VEHICLE)}
                  disabled={updateVehicleMutation.isPending}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={handleSaveVehicle}
                  disabled={updateVehicleMutation.isPending}
                >
                  {updateVehicleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Vehículo
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
