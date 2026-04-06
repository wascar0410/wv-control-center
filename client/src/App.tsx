import { Suspense, lazy } from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import LoginPage from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const LoadsDispatch = lazy(() => import("./pages/LoadsDispatch"));
const LoadDetailPage = lazy(() => import("./pages/LoadDetailPage"));
const FleetTracking = lazy(() => import("./pages/FleetTracking"));
const DriverOps = lazy(() => import("./pages/DriverOps"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const About = lazy(() => import("./pages/About"));
const BusinessSettings = lazy(() => import("./pages/BusinessSettings"));
const WalletDashboard = lazy(() => import("./pages/WalletDashboard"));
const SettlementsPage = lazy(() => import("./pages/SettlementsPage"));
const QuoteAnalyzer = lazy(() => import("./pages/QuoteAnalyzer"));
const InvoicingPage = lazy(() => import("./pages/InvoicingPage"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const AlertsTasksPage = lazy(() => import("./pages/AlertsTasksPage"));
const Chat = lazy(() => import("./pages/Chat"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Quotation = lazy(() => import("./pages/Quotation"));
const CarrierPacket = lazy(() => import("./pages/CarrierPacket"));
const PlaidOAuthReturn = lazy(() => import("./pages/PlaidOAuthReturn"));
const Partnership = lazy(() => import("./pages/Partnership"));
const BusinessPlan = lazy(() => import("./pages/BusinessPlan"));

const withLayout = (Component: React.ComponentType<any>) => (props: any) => (
  <DashboardLayout>
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
      <Component {...props} />
    </Suspense>
  </DashboardLayout>
);

export default function App() {
  return (
    <Router>
      <Switch>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" component={LoginPage} />
        <Route path="/quotation" component={Quotation} />
        <Route path="/carrier-packet" component={withLayout(CarrierPacket)} />
        <Route path="/plaid-oauth-return" component={PlaidOAuthReturn} />
        <Route path="/partnership" component={withLayout(Partnership)} />
        <Route path="/business-plan" component={BusinessPlan} />

        {/* ===== NEW ARCHITECTURE ROUTES ===== */}
        {/* Command Center */}
        <Route path="/command-center" component={withLayout(CommandCenter)} />

        {/* Operations */}
        <Route path="/loads-dispatch" component={withLayout(LoadsDispatch)} />
        <Route path="/loads/:id" component={withLayout(LoadDetailPage)} />
        <Route path="/quote-analyzer" component={withLayout(QuoteAnalyzer)} />

        {/* Finance */}
        <Route path="/finance-dashboard" component={withLayout(FinanceDashboard)} />
        <Route path="/finance-wallet" component={withLayout(WalletDashboard)} />
        <Route path="/finance-settlements" component={withLayout(SettlementsPage)} />
        <Route path="/invoicing" component={withLayout(InvoicingPage)} />

        {/* Fleet & Drivers */}
        <Route path="/fleet-tracking" component={withLayout(FleetTracking)} />

        {/* Team & Company */}
        <Route path="/team" component={withLayout(UserManagement)} />
        <Route path="/company" component={withLayout(About)} />
        <Route path="/chat" component={withLayout(Chat)} />

        {/* Coordination */}
        <Route path="/alerts-tasks" component={withLayout(AlertsTasksPage)} />

        {/* Settings & Profile */}
        <Route path="/settings" component={withLayout(BusinessSettings)} />
        <Route path="/profile" component={withLayout(UserProfile)} />

        {/* Driver Routes */}
        <Route path="/driver" component={withLayout(DriverOps)} />

        {/* ===== REDIRECTS (BACKWARD COMPATIBILITY) ===== */}
        <Route path="/dashboard">{() => <Redirect to="/command-center" />}</Route>
        <Route path="/loads">{() => <Redirect to="/loads-dispatch" />}</Route>
        <Route path="/finance">{() => <Redirect to="/finance-dashboard" />}</Route>
        <Route path="/executive-dashboard">{() => <Redirect to="/command-center" />}</Route>
        <Route path="/fleet-map">{() => <Redirect to="/fleet-tracking" />}</Route>
        <Route path="/fleet-management">{() => <Redirect to="/fleet-tracking" />}</Route>
        <Route path="/driver-dashboard">{() => <Redirect to="/driver" />}</Route>
        <Route path="/driver-wallet">{() => <Redirect to="/finance-wallet" />}</Route>
        <Route path="/transactions">{() => <Redirect to="/finance-dashboard" />}</Route>

        {/* ===== DEFAULT REDIRECT ===== */}
        <Route path="/">{() => <Redirect to="/command-center" />}</Route>
        <Route>{() => <Redirect to="/command-center" />}</Route>
      </Switch>
    </Router>
  );
}
