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
import QuotationHistory from "./pages/QuotationHistory";
import ImportBrokerLoads from "./pages/ImportBrokerLoads";
import BrokerLoadsManagement from "./pages/BrokerLoadsManagement";
import AccountingFinance from "./pages/AccountingFinance";


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

function QuotationPage() {
  return <Quotation />;
}

function QuotationHistoryPage() {
  return (
    <DashboardLayout>
      <QuotationHistory />
    </DashboardLayout>
  );
}

function ImportBrokerLoadsPage() {
  return (
    <DashboardLayout>
      <ImportBrokerLoads />
    </DashboardLayout>
  );
}

function BrokerLoadsManagementPage() {
  return (
    <DashboardLayout>
      <BrokerLoadsManagement />
    </DashboardLayout>
  );
}

function AccountingFinancePage() {
  return (
    <DashboardLayout>
      <AccountingFinance />
    </DashboardLayout>
  );
}

function BusinessSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4">
        <h1 className="text-3xl font-bold">Business Settings TEST</h1>

        <div className="rounded-lg border p-4">
          Si ves esta pantalla, la ruta funciona y el problema está en el archivo BusinessSettings.tsx
        </div>
      </div>
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
      <Route path="/quotation" component={QuotationPage} />
      <Route path="/quotation-history" component={QuotationHistoryPage} />
      <Route path="/import-broker-loads" component={ImportBrokerLoadsPage} />
      <Route path="/broker-loads-management" component={BrokerLoadsManagementPage} />
      <Route path="/accounting-finance" component={AccountingFinancePage} />
      <Route path="/business-settings" component={BusinessSettingsPage} />
    </Switch>
  );
}
