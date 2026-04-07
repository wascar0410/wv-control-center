import { Suspense, lazy, type ComponentType } from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";

// Lazy load pages
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
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
        <Route path="/command-center" component={withLayout(CommandCenter)} />

        {/* Operations */}
        <Route path="/loads-dispatch" component={withLayout(LoadsDispatch)} />
        <Route path="/loads/:id" component={withLayout(LoadDetailPage)} />
        <Route path="/quote-analyzer" component={withLayout(QuoteAnalyzer)} />

        {/* Finance */}
        <Route
          path="/finance-dashboard"
          component={withLayout(FinanceDashboard)}
        />
        <Route path="/finance-wallet" component={withLayout(WalletDashboard)} />
        <Route
          path="/finance-settlements"
          component={withLayout(SettlementsPage)}
        />
        <Route path="/invoicing" component={withLayout(InvoicingPage)} />

        {/* Fleet & Drivers */}
        <Route path="/fleet-tracking" component={withLayout(FleetTracking)} />
        <Route path="/driver" component={withLayout(DriverOps)} />

        {/* Team & Company */}
        <Route path="/team" component={withLayout(UserManagement)} />
        <Route path="/company" component={withLayout(Company)} />
        <Route path="/company-management" component={withLayout(CompanyManagement)} />
        <Route path="/chat" component={withLayout(Chat)} />
        <Route path="/profile" component={withLayout(UserProfile)} />
        <Route path="/settings" component={withLayout(BusinessSettings)} />
        <Route path="/partnership" component={withLayout(Partnership)} />

        {/* Coordination */}
        <Route path="/alerts-tasks" component={withLayout(AlertsTasksPage)} />

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
        <Route path="/">{() => <Redirect to="/command-center" />}</Route>
        <Route>{() => <Redirect to="/command-center" />}</Route>
      </Switch>
    </Router>
  );
}
