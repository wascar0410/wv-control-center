import { Suspense, lazy, type ComponentType } from "react";
import { Router, Route, Switch, Redirect, useLocation } from "wouter";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./contexts/AuthContext";

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
    // Redirect driver to /driver, others to /command-center
    navigate(user?.role === "driver" ? "/driver" : "/command-center");
    return null;
  }

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
        <Route path="/quotation" component={withSuspense(Quotation)} />
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
            if (user?.role === 'driver') {
              return <Redirect to="/driver" />;
            }
            return <Redirect to="/command-center" />;
          }}
        </Route>
        <Route>
          {() => {
            const { user, loading: isLoading } = useAuth();
            if (isLoading) {
              return <PageLoader />;
            }
            if (user?.role === 'driver') {
              return <Redirect to="/driver" />;
            }
            return <Redirect to="/command-center" />;
          }}
        </Route>
      </Switch>
    </Router>
  );
}
