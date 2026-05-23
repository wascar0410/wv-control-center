import { Suspense, lazy, type ComponentType } from "react";
import { Router, Route, Switch, Redirect, useLocation } from "wouter";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./contexts/AuthContext";
import { getDefaultRouteForRole, logRouteGuardDecision, getDriverRedirectTarget } from "./lib/routeUtils";

// Lazy load pages
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const DispatchBoard = lazy(() => import("./pages/DispatchBoard"));
const LoadsDispatch = lazy(() => import("./pages/LoadsDispatch"));
const LoadDetailPage = lazy(() => import("./pages/LoadDetailPage"));
const FleetTracking = lazy(() => import("./pages/FleetTracking"));
const DriverOps = lazy(() => import("./pages/DriverOps"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Company = lazy(() => import("./pages/Company"));
const CompanyManagement = lazy(() => import("./pages/CompanyManagement"));
const BusinessSettings = lazy(() => import("./pages/BusinessSettings"));
const WalletDashboard = lazy(() => import("./pages/WalletDashboard"));
const SettlementsPage = lazy(() => import("./pages/SettlementsPage"));
const QuoteAnalyzer = lazy(() => import("./pages/QuoteAnalyzer"));
const InvoicingPage = lazy(() => import("./pages/InvoicingPage"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const BankingCashFlow = lazy(() => import("./pages/BankingCashFlow"));
const AlertsTasksPage = lazy(() => import("./pages/AlertsTasksPage"));
const Chat = lazy(() =>
  import("./pages/Chat").then((m) => ({ default: m.Chat }))
);
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Quotation = lazy(() => import("./pages/Quotation"));
const PlaidOAuthReturn = lazy(() => import("./pages/PlaidOAuthReturn"));
const Partnership = lazy(() => import("./pages/Partnership"));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      Cargando...
    </div>
  );
}

const withLayout = (Component: ComponentType<any>) => (props: any) => (
  <DashboardLayout>
    <Suspense fallback={<PageLoader />}>
      <Component {...props} />
    </Suspense>
  </DashboardLayout>
);

const withSuspense = (Component: ComponentType<any>) => (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

// Role-based route wrapper - enforces role restrictions
const withRoleGuard = (
  Component: ComponentType<any>,
  allowedRoles: string[]
) => (props: any) => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Log the guard decision for debugging
    logRouteGuardDecision(
      user?.role,
      window.location.pathname,
      getDriverRedirectTarget(user),
      false
    );
    
    // Redirect using central logic
    const redirectTarget = getDriverRedirectTarget(user);
    navigate(redirectTarget, { replace: true });
    return null;
  }

  // Log successful access
  logRouteGuardDecision(
    user?.role,
    window.location.pathname,
    window.location.pathname,
    true
  );

  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <Router>
      <Switch>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" component={LoginPage} />
        <Route path="/quotation" component={withRoleGuard(Quotation, ["owner", "admin"])} />
        <Route
          path="/plaid-oauth-return"
          component={withSuspense(PlaidOAuthReturn)}
        />

        {/* ===== ROUTES WITH LAYOUT ===== */}
        {/* Owner/Admin only routes */}
        <Route path="/command-center" component={withRoleGuard(CommandCenter, ["owner", "admin"])} />
        <Route path="/dispatch-board" component={withRoleGuard(DispatchBoard, ["owner", "admin", "dispatcher"])} />

        {/* Operations */}
        <Route path="/loads-dispatch" component={withRoleGuard(LoadsDispatch, ["owner", "admin", "dispatcher"])} />
        <Route path="/loads/:id" component={withLayout(LoadDetailPage)} />
        <Route path="/quote-analyzer" component={withRoleGuard(QuoteAnalyzer, ["owner", "admin"])} />

        {/* Finance - Owner/Admin only */}
        <Route
          path="/finance-dashboard"
          component={withRoleGuard(FinanceDashboard, ["owner", "admin"])}
        />
        <Route path="/finance-wallet" component={withLayout(WalletDashboard)} />
        <Route
          path="/finance-settlements"
          component={withRoleGuard(SettlementsPage, ["owner", "admin"])}
        />
        <Route path="/invoicing" component={withRoleGuard(InvoicingPage, ["owner", "admin"])} />
        <Route path="/banking-cashflow" component={withRoleGuard(BankingCashFlow, ["owner", "admin"])} />

        {/* Fleet & Drivers */}
        <Route path="/fleet-tracking" component={withRoleGuard(FleetTracking, ["owner", "admin"])} />
        <Route path="/driver" component={withLayout(DriverOps)} />

        {/* Team & Company - Owner/Admin only */}
        <Route path="/team" component={withRoleGuard(UserManagement, ["owner", "admin"])} />
        <Route path="/company" component={withLayout(Company)} />
        <Route path="/company-management" component={withRoleGuard(CompanyManagement, ["owner", "admin"])} />
        <Route path="/chat" component={withLayout(Chat)} />
        <Route path="/profile" component={withLayout(UserProfile)} />
        <Route path="/settings" component={withRoleGuard(BusinessSettings, ["owner", "admin"])} />
        <Route path="/partnership" component={withLayout(Partnership)} />

        {/* Coordination - Owner/Admin only */}
        <Route path="/alerts-tasks" component={withRoleGuard(AlertsTasksPage, ["owner", "admin"])} />

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
            
            // Debug panel (visible only when localStorage.debugRoleRedirect === "1")
            const showDebug = typeof window !== 'undefined' && localStorage.getItem('debugRoleRedirect') === '1';
            
            if (showDebug) {
              return (
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#1a1a1a',
                  color: '#00ff00',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  zIndex: 9999,
                  border: '2px solid #00ff00',
                  maxWidth: '500px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>ROOT REDIRECT DEBUG</div>
                  <div>component: "RootRedirect"</div>
                  <div>path: "{location.pathname}"</div>
                  <div>loading: {isLoading ? 'true' : 'false'}</div>
                  <div>userEmail: "{user?.email || 'undefined'}"</div>
                  <div>userRole: "{user?.role || 'undefined'}"</div>
                  <div>computedDefaultRoute: "{defaultRoute}"</div>
                  <div>willRedirectTo: "{defaultRoute}"</div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#ffff00' }}>Redirecting in 3 seconds...</div>
                </div>
              );
            }
            
            return <Redirect to={defaultRoute} />;
          }}
        </Route>
        <Route>
          {() => {
            const { user, loading: isLoading } = useAuth();
            if (isLoading) {
              return <PageLoader />;
            }
            
            // Use central route logic for unknown routes
            const defaultRoute = getDefaultRouteForRole(user);
            
            // Log the redirect decision
            logRouteGuardDecision(
              user?.role,
              window.location.pathname,
              defaultRoute,
              true
            );
            
            return <Redirect to={defaultRoute} />;
          }}
        </Route>
      </Switch>
    </Router>
  );
}
