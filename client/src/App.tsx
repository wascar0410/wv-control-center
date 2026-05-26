import { Router, Route, Redirect } from "wouter";
import { Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRouteForRole, logRouteGuardDecision } from "@/lib/routeUtils";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { withRoleGuard, withSuspense } from "@/lib/routeGuards";
import { AlertCircle } from "lucide-react";

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DriverPage = lazy(() => import("@/pages/DriverPage"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const FinanceDashboard = lazy(() => import("@/pages/FinanceDashboard"));
const DispatchBoard = lazy(() => import("@/pages/DispatchBoard"));
const Quotation = lazy(() => import("@/pages/Quotation"));
const Profile = lazy(() => import("@/pages/UserProfile"));
const WalletDashboard = lazy(() => import("@/pages/WalletDashboard"));

// Existing pages for previously placeholder routes
const LoadsDispatch = lazy(() => import("@/pages/LoadsDispatch"));
const QuoteAnalyzer = lazy(() => import("@/pages/QuoteAnalyzer"));
const SettlementsPage = lazy(() => import("@/pages/SettlementsPage"));
const BankingCashFlow = lazy(() => import("@/pages/BankingCashFlow"));
const InvoicingPage = lazy(() => import("@/pages/InvoicingPage"));
const FleetTracking = lazy(() => import("@/pages/FleetTracking"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const ChatPlaceholder = lazy(() => import("@/pages/ChatPlaceholder"));
const Company = lazy(() => import("@/pages/Company"));
const CompanyManagement = lazy(() => import("@/pages/CompanyManagement"));
const AlertsTasksPage = lazy(() => import("@/pages/AlertsTasksPage"));

// Placeholder component for unimplemented features
function ComingSoonPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {description && <p className="text-gray-500 mb-4 max-w-md">{description}</p>}
      <p className="text-lg text-gray-400">Esta sección estará disponible pronto</p>
    </div>
  );
}

// Placeholder only for Settings (no existing SettingsPage.tsx)
const SettingsPlaceholder = () => <ComingSoonPlaceholder title="Settings" description="Configuración" />;

function PageLoader() {
  return <DashboardLayoutSkeleton />;
}

// Pre-create wrapped components to avoid remounting issues
const ProtectedDriverPage = withRoleGuard(DriverPage, ["driver", "owner", "admin"]);
const ProtectedWalletDashboard = withRoleGuard(WalletDashboard, ["driver", "owner", "admin"]);
const ProtectedCommandCenter = withRoleGuard(CommandCenter, ["owner", "admin"]);
const ProtectedFinanceDashboard = withRoleGuard(FinanceDashboard, ["owner", "admin"]);
const ProtectedDispatchBoard = withRoleGuard(DispatchBoard, ["owner", "admin"]);
const ProtectedQuotation = withRoleGuard(Quotation, ["owner", "admin"]);
const ProtectedLoadsDispatch = withRoleGuard(LoadsDispatch, ["owner", "admin"]);
const ProtectedQuoteAnalyzer = withRoleGuard(QuoteAnalyzer, ["owner", "admin"]);
const ProtectedSettlementsPage = withRoleGuard(SettlementsPage, ["owner", "admin"]);
const ProtectedBankingCashFlow = withRoleGuard(BankingCashFlow, ["owner", "admin"]);
const ProtectedInvoicingPage = withRoleGuard(InvoicingPage, ["owner", "admin"]);
const ProtectedFleetTracking = withRoleGuard(FleetTracking, ["owner", "admin"]);
const ProtectedUserManagement = withRoleGuard(UserManagement, ["owner", "admin"]);
const ProtectedChatPlaceholder = withRoleGuard(ChatPlaceholder, ["owner", "admin", "driver"]);
const ProtectedCompany = withRoleGuard(Company, ["owner", "admin"]);
const ProtectedCompanyManagement = withRoleGuard(CompanyManagement, ["owner", "admin"]);
const ProtectedAlertsTasksPage = withRoleGuard(AlertsTasksPage, ["owner", "admin"]);
const ProtectedSettingsPlaceholder = withRoleGuard(SettingsPlaceholder, ["owner", "admin"]);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<DashboardLayoutSkeleton />}>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" component={withSuspense(LoginPage)} />
        <Route path="/home" component={withSuspense(Home)} />

        {/* ===== DRIVER ROUTES (also accessible to owner/admin) ===== */}
        <Route path="/driver" component={ProtectedDriverPage} />
        <Route path="/finance-wallet" component={ProtectedWalletDashboard} />
        <Route path="/profile" component={withSuspense(Profile)} />

        {/* ===== OWNER/ADMIN ROUTES ===== */}
        <Route path="/command-center" component={ProtectedCommandCenter} />
        <Route path="/finance-dashboard" component={ProtectedFinanceDashboard} />
        <Route path="/dispatch-board" component={ProtectedDispatchBoard} />
        <Route path="/quotation" component={ProtectedQuotation} />
        
        {/* ===== EXISTING FEATURE ROUTES ===== */}
        <Route path="/loads-dispatch" component={ProtectedLoadsDispatch} />
        <Route path="/quote-analyzer" component={ProtectedQuoteAnalyzer} />
        <Route path="/finance-settlements" component={ProtectedSettlementsPage} />
        <Route path="/banking-cashflow" component={ProtectedBankingCashFlow} />
        <Route path="/invoicing" component={ProtectedInvoicingPage} />
        <Route path="/fleet-tracking" component={ProtectedFleetTracking} />
        <Route path="/team" component={ProtectedUserManagement} />
        <Route path="/chat" component={ProtectedChatPlaceholder} />
        <Route path="/company" component={ProtectedCompany} />
        <Route path="/company-management" component={ProtectedCompanyManagement} />
        <Route path="/alerts-tasks" component={ProtectedAlertsTasksPage} />
        <Route path="/settings" component={ProtectedSettingsPlaceholder} />

        {/* ===== REDIRECTS (BACKWARD COMPATIBILITY) ===== */}
        <Route path="/about">{() => <Redirect to="/company" />}</Route>
        <Route path="/carrier-packet">{() => <Redirect to="/company" />}</Route>
        <Route path="/business-plan">{() => <Redirect to="/company" />}</Route>
        <Route path="/dashboard">{() => <Redirect to="/command-center" />}</Route>
        <Route path="/loads">{() => <Redirect to="/loads-dispatch" />}</Route>
        <Route path="/finance">{() => <Redirect to="/finance-dashboard" />}</Route>
        <Route path="/executive-dashboard">
          {() => <Redirect to="/command-center" />}
        </Route>
        <Route path="/fleet-map">{() => <Redirect to="/fleet-tracking" />}</Route>
        <Route path="/fleet-management">
          {() => <Redirect to="/fleet-tracking" />}
        </Route>
        <Route path="/driver-dashboard">{() => <Redirect to="/driver" />}</Route>
        <Route path="/driver-wallet">
          {() => <Redirect to="/finance-wallet" />}
        </Route>
        <Route path="/transactions">
          {() => <Redirect to="/finance-dashboard" />}
        </Route>
        <Route path="/accounting-finance">{() => <Redirect to="/finance-dashboard" />}</Route>

        {/* ===== DEFAULTS ===== */}
        <Route path="/">
          {() => {
            const { user, loading: isLoading } = useAuth();
            if (isLoading) {
              return <PageLoader />;
            }
            
            // Use central route logic
            const defaultRoute = getDefaultRouteForRole(user);
            
            // Log the redirect decision
            logRouteGuardDecision(
              user?.role,
              "/",
              defaultRoute,
              true
            );
            
            return <Redirect to={defaultRoute} />;
          }}
        </Route>

        {/* ===== 404 CATCH-ALL ===== */}
        <Route>
          {() => {
            const { user, loading: isLoading } = useAuth();
            
            if (isLoading) {
              return <PageLoader />;
            }
            
            if (!user) {
              return <Redirect to="/login" />;
            }
            
            const defaultRoute = getDefaultRouteForRole(user);
            return <Redirect to={defaultRoute} />;
          }}
        </Route>
      </Suspense>
    </Router>
  );
}
