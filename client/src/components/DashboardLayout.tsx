import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { brand, colors } from "@/lib/brand";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Package,
  DollarSign,
  Users,
  Truck,
  TrendingUp,
  CreditCard,
  Calculator,
  Zap,
  BarChart3,
  Settings,
  Download,
  MessageSquare,
  User as UserIcon,
  Info,
  UserPlus,
  Activity,
  FileText,
  Wallet,
  Navigation,
  Shield,
  Building2,
  Headphones,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { AddDriverModal } from "./AddDriverModal";

const adminMenuItems = [
  // ===== 1. COMMAND CENTER =====
  { icon: LayoutDashboard, label: "Command Center", path: "/command-center", description: "Control total del negocio" },

  // ===== OPERATIONS =====
  { icon: Package, label: "Loads & Dispatch", path: "/loads-dispatch", description: "Cargas, cotización y dispatch" },
  { icon: BarChart3, label: "Quote Analyzer", path: "/quote-analyzer", description: "Análisis de cotizaciones estimado vs real" },

  // ===== FINANCE =====
  { icon: DollarSign, label: "Finance", path: "/finance", description: "Ingresos, gastos y profit" },
  { icon: Wallet, label: "Wallet", path: "/finance-wallet", description: "Billetera y retiros" },
  { icon: CreditCard, label: "Settlements", path: "/finance-settlements", description: "Distribución de ganancias" },

   // ===== FLEET =====
  { icon: Truck, label: "Fleet & Drivers", path: "/fleet-tracking", description: "Operaciones de choferes y flota" },

  // ===== TEAM =====
  { icon: Users, label: "Team", path: "/team", description: "Usuarios y desempeño" },

  // ===== CHAT =====
  { icon: MessageSquare, label: "Chat", path: "/chat", description: "Mensajes" },

  // ===== COMPANY =====
  { icon: Building2, label: "Company", path: "/company", description: "Información corporativa" },

  // ===== SETTINGS =====
  { icon: Settings, label: "Settings", path: "/settings", description: "Configuración del sistema" },

  // ===== PROFILE =====
  { icon: UserIcon, label: "Profile", path: "/profile", description: "Perfil del usuario" },
];
const driverMenuItems = [
  { icon: LayoutDashboard, label: "Driver Ops", path: "/driver", description: "Dashboard + operaciones" },
  { icon: TrendingUp, label: "Mi Desempeño", path: "/driver-performance", description: "Historial y tendencias" },
  { icon: Wallet, label: "Mi Billetera", path: "/finance-wallet", description: "Mis pagos y liquidaciones" },
  { icon: MessageSquare, label: "Chat", path: "/chat", description: "Mensajes" },
  { icon: Info, label: "Acerca de", path: "/about", description: "Información de WV Transport" },
];

const getMenuItems = (role?: string) => {
  if (role === "driver") return driverMenuItems;
  return adminMenuItems;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

const FALLBACK_USER = {
  name: "WV Admin",
  email: "info@wvtransports.com",
  role: "owner",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} user={(user ?? FALLBACK_USER) as any}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  user,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  user: { name?: string; email?: string; role?: string };
}) {
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      localStorage.removeItem("wv_token");
      localStorage.removeItem("wv_user_role");
      localStorage.removeItem("wv_user_email");
      window.location.href = "/login";
    },
  });

  const logout = () => logoutMutation.mutate();

  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const menuItems = getMenuItems(user?.role);
  const activeMenuItem = menuItems.find((item) => item.path === location);

  const roleLabel =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "driver"
      ? "Chofer"
      : user?.role === "owner"
      ? "Propietario"
      : "Usuario";

  const roleColor =
    user?.role === "admin"
      ? colors.accent
      : user?.role === "driver"
      ? colors.warning
      : user?.role === "owner"
      ? colors.success
      : colors.textMuted;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          disableTransition={isResizing}
          className="border-r"
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.secondary,
            color: "white",
          }}
        >
          <SidebarHeader
            className="h-16 justify-center border-b"
            style={{ borderColor: colors.secondary }}
          >
            <div className="flex w-full items-center gap-3 px-3">
              <button
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none"
                style={{ color: "rgba(255,255,255,0.75)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>

              {!isCollapsed && (
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png"
                    alt="WV Control Logo"
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold leading-none text-white">
                      {brand.product}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/60">
                      {brand.company}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-3">
            <SidebarMenu className="gap-1 px-2">
              {menuItems.map((item) => {
                const isActive = location === item.path ||
                  (item.path === "/driver" && location.startsWith("/driver/"));

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 rounded-lg transition-all"
                      style={{
                        backgroundColor: isActive ? colors.accent : "transparent",
                        color: isActive ? "white" : "#E2E8F0",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = colors.secondary;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <item.icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: isActive ? "white" : "#E2E8F0" }}
                      />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter
            className="border-t p-3"
            style={{ borderColor: colors.secondary }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus:outline-none"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Avatar className="h-8 w-8 shrink-0 border" style={{ borderColor: colors.secondary }}>
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{
                        backgroundColor: "rgba(29,78,216,0.2)",
                        color: "#BFDBFE",
                      }}
                    >
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>

                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-none text-white">
                        {user?.name ?? "Usuario"}
                      </p>
                      <p
                        className="mt-1 truncate text-xs"
                        style={{ color: roleColor }}
                      >
                        {roleLabel}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name ?? "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>

                {(user?.role === "admin" || user?.role === "owner") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowAddDriver(true)} className="cursor-pointer">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Agregar Chofer
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    try {
                      logout();
                    } catch {
                      window.location.href = "/";
                    }
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`${isCollapsed ? "hidden" : ""} absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors`}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(29,78,216,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset style={{ backgroundColor: colors.light }}>
        {isMobile && (
          <div
            className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 backdrop-blur"
            style={{
              backgroundColor: colors.light,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="text-sm font-medium" style={{ color: colors.primary }}>
                {activeMenuItem?.label ?? brand.product}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.soft }}
              >
                <Truck className="h-4 w-4" style={{ color: colors.accent }} />
              </div>
            </div>
          </div>
        )}

        <main
          className="flex-1 overflow-auto p-4 md:p-6"
          style={{
            backgroundColor: colors.light,
            color: colors.text,
          }}
        >
          {children}
        </main>
      </SidebarInset>

      <AddDriverModal open={showAddDriver} onOpenChange={setShowAddDriver} />
    </>
  );
}
