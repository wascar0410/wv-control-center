import { Route, Switch, useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./contexts/AuthContext";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Loads from "./pages/Loads";
import Finance from "./pages/Finance";
import Partnership from "./pages/Partnership";
import UserProfile from "./pages/UserProfile";
import DriverView from "./pages/DriverView";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Quotation from "./pages/Quotation";
import QuotationHistory from "./pages/QuotationHistory";
import ImportBrokerLoads from "./pages/ImportBrokerLoads";
import BrokerLoadsManagement from "./pages/BrokerLoadsManagement";
import AccountingFinance from "./pages/AccountingFinance";
import BusinessSettings from "./pages/BusinessSettings";
import BatchPayments from "./pages/BatchPayments";
import DriverPerformance from "./pages/DriverPerformance";
import { Chat } from "./pages/Chat";
import About from "./pages/About";
import BusinessPlan from "./pages/BusinessPlan";
import BusinessPlanAnalytics from "./pages/BusinessPlanAnalytics";
import CarrierPacket from "./pages/CarrierPacket";
import LoadDetail from "./pages/LoadDetail";
import NewLoad from "./pages/NewLoad";
import DriverDashboard from "./pages/DriverDashboard";
import DriverLoadDetail from "./pages/DriverLoadDetail";
import DriverWallet from "./pages/DriverWallet";
import FleetMap from "./pages/FleetMap";
import FleetManagement from "./pages/FleetManagement";
import BrokerDashboard from "./pages/BrokerDashboard";
import DispatcherPerformance from "./pages/DispatcherPerformance";
import PlaidOAuthReturn from "./pages/PlaidOAuthReturn";
import UserManagement from "./pages/UserManagement";

function withLayout(Component: any) {
  return function WrappedPage() {
    return (
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    );
  };
}

/** Smart home redirect: owners → /dashboard, drivers → /driver */
function HomeRedirect() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
    } else if (user.role === "owner" || user.role === "admin") {
      navigate("/command-center");
    } else {
      navigate("/driver");
    }
  }, [user, loading, navigate]);

  return null;
}

export default function App() {
  return (
    <Switch>
     {/* ===== NEW ARCHITECTURE ROUTES ===== */}

<Route path="/command-center" component={withLayout(Dashboard)} />

<Route path="/loads-dispatch" component={withLayout(Loads)} />

<Route path="/fleet-drivers" component={withLayout(DriverView)} />

<Route path="/team" component={withLayout(UserManagement)} />

<Route path="/company" component={withLayout(About)} />

<Route path="/settings" component={withLayout(BusinessSettings)} />
      {/* ===== REDIRECTS (NO BREAK APP) ===== */}

<Route path="/dashboard">{() => <Redirect to="/command-center" />}</Route>

<Route path="/loads">{() => <Redirect to="/loads-dispatch" />}</Route>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/quotation" component={Quotation} />
      <Route path="/carrier-packet" component={withLayout(CarrierPacket)} />

      {/* Admin / Owner routes */}
      <Route path="/loads/new" component={withLayout(NewLoad)} />
      <Route path="/loads/:id" component={withLayout(LoadDetail)} />
      <Route path="/finance" component={withLayout(Finance)} />
      <Route path="/plaid-oauth-return" component={PlaidOAuthReturn} />
      <Route path="/transactions">{() => <Redirect to="/finance" />}</Route>
      <Route path="/partnership" component={withLayout(Partnership)} />
      <Route path="/profile" component={withLayout(UserProfile)} />
      <Route path="/executive-dashboard" component={withLayout(ExecutiveDashboard)} />
      <Route path="/quotation-history" component={withLayout(QuotationHistory)} />
      <Route path="/import-broker-loads" component={withLayout(ImportBrokerLoads)} />
      <Route path="/broker-loads-management" component={withLayout(BrokerLoadsManagement)} />
      <Route path="/accounting-finance" component={withLayout(AccountingFinance)} />
      <Route path="/business-settings" component={withLayout(BusinessSettings)} />
      <Route path="/batch-payments" component={withLayout(BatchPayments)} />
      <Route path="/driver-performance" component={withLayout(DriverPerformance)} />
      <Route path="/fleet-map" component={withLayout(FleetMap)} />
      <Route path="/fleet-management" component={withLayout(FleetManagement)} />
      <Route path="/broker-dashboard" component={withLayout(BrokerDashboard)} />
      <Route path="/dispatcher-performance" component={withLayout(DispatcherPerformance)} />
      <Route path="/chat" component={withLayout(Chat)} />
      <Route path="/about" component={withLayout(About)} />
      <Route path="/user-management" component={withLayout(UserManagement)} />
      <Route path="/business-plan" component={BusinessPlan} />
      <Route path="/business-plan-analytics" component={withLayout(BusinessPlanAnalytics)} />

      {/* Driver routes */}
      <Route path="/driver/loads/:id" component={withLayout(DriverLoadDetail)} />
      <Route path="/driver-dashboard" component={withLayout(DriverDashboard)} />
      <Route path="/driver-wallet" component={withLayout(DriverWallet)} />
      <Route path="/driver" component={withLayout(DriverView)} />

      {/* Root → smart redirect */}
      <Route path="/" component={HomeRedirect} />
    </Switch>
  );
}
