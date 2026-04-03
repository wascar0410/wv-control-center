import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";

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
import BusinessSettings from "./pages/BusinessSettings";
import BatchPayments from "./pages/BatchPayments";
import DriverPerformance from "./pages/DriverPerformance";
import { Chat } from "./pages/Chat";
import About from "./pages/About";
import BusinessPlan from "./pages/BusinessPlan";
import BusinessPlanAnalytics from "./pages/BusinessPlanAnalytics";

function withLayout(Component: any) {
  return function WrappedPage() {
    return (
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    );
  };
}

export default function App() {
  return (
    <Switch>
      <Route path="/dashboard" component={withLayout(Dashboard)} />
      <Route path="/loads" component={withLayout(Loads)} />
      <Route path="/finance" component={withLayout(Finance)} />
      <Route path="/transactions" component={withLayout(Transactions)} />
      <Route path="/partnership" component={withLayout(Partnership)} />
      <Route path="/profile" component={withLayout(UserProfile)} />
      <Route path="/driver" component={DriverViewProduction} />
      <Route path="/executive-dashboard" component={withLayout(ExecutiveDashboard)} />
      <Route path="/quotation" component={Quotation} />
      <Route path="/quotation-history" component={withLayout(QuotationHistory)} />
      <Route path="/import-broker-loads" component={withLayout(ImportBrokerLoads)} />
      <Route path="/broker-loads-management" component={withLayout(BrokerLoadsManagement)} />
      <Route path="/accounting-finance" component={withLayout(AccountingFinance)} />
      <Route path="/business-settings" component={withLayout(BusinessSettings)} />
      <Route path="/batch-payments" component={withLayout(BatchPayments)} />
      <Route path="/driver-performance" component={withLayout(DriverPerformance)} />
      <Route path="/chat" component={withLayout(Chat)} />

      <Route path="/" component={withLayout(Dashboard)} />
      <Route path="/about" component={withLayout(About)} />
      <Route path="/business-plan" component={BusinessPlan} />
      <Route path="/business-plan-analytics" component={withLayout(BusinessPlanAnalytics)} />
    </Switch>
  );
}
