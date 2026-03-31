import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Loads from "./pages/Loads";
import Finance from "./pages/Finance";
import Transactions from "./pages/Transactions";
import Partnership from "./pages/Partnership";
import UserProfile from "./pages/UserProfile";
import DriverViewProduction from "./pages/DriverViewProduction";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Quotation from "./pages/Quotation";

function DashboardPage() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}

function LoadsPage() {
  return (
    <DashboardLayout>
      <Loads />
    </DashboardLayout>
  );
}

function FinancePage() {
  return (
    <DashboardLayout>
      <Finance />
    </DashboardLayout>
  );
}

function TransactionsPage() {
  return (
    <DashboardLayout>
      <Transactions />
    </DashboardLayout>
  );
}

function PartnershipPage() {
  return (
    <DashboardLayout>
      <Partnership />
    </DashboardLayout>
  );
}

function ProfilePage() {
  return (
    <DashboardLayout>
      <UserProfile />
    </DashboardLayout>
  );
}

function ExecutiveDashboardPage() {
  return (
    <DashboardLayout>
      <ExecutiveDashboard />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/about" component={About} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/loads" component={LoadsPage} />
      <Route path="/finance" component={FinancePage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/partnership" component={PartnershipPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/driver" component={DriverViewProduction} />
      <Route path="/executive-dashboard" component={ExecutiveDashboardPage} />
      <Route path="/quotation" component={Quotation} />
    </Switch>
  );
}
