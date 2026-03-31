import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Loads from "./pages/Loads";
import Finance from "./pages/Finance";
import Partnership from "./pages/Partnership";
import DriverView from "./pages/DriverView";
import DriverViewProduction from "./pages/DriverViewProduction";
import DriverPerformance from "./pages/DriverPerformance";
import Transactions from "./pages/Transactions";
import Quotation from "./pages/Quotation";
import QuotationHistory from "./pages/QuotationHistory";
import ImportBrokerLoads from "./pages/ImportBrokerLoads";
import BrokerLoadsManagement from "./pages/BrokerLoadsManagement";
import { BatchPaymentsDashboard } from "./pages/BatchPaymentsDashboard";
import AccountingFinance from "./pages/AccountingFinance";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import BusinessSettings from "./pages/BusinessSettings";
import LoadEvaluator from "./pages/LoadEvaluator";
import TaxCompliance from "./pages/TaxCompliance";
import { Chat } from "./pages/Chat";
import UserProfile from "./pages/UserProfile";
import About from "./pages/About";
import { AdminContacts } from "./pages/AdminContacts";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RealtimeDashboard } from "./pages/RealtimeDashboard";
import { FloatingChatButton } from "./components/FloatingChatButton";
import { LoadNotificationToast } from "./components/LoadNotificationToast";
import { useAuth } from "./_core/hooks/useAuth";

function AuthGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ProtectedRoute({
  component: Component,
  requiredRole,
}: {
  component: React.ComponentType;
  requiredRole?: "admin" | "user" | "driver";
}) {
  const { user } = useAuth();

  if (user?.role === "owner") {
    return <Component />;
  }

  if (requiredRole === "admin" && user?.role !== "admin") {
    return <NotFound />;
  }

  if (requiredRole === "driver" && user?.role !== "driver" && user?.role !== "admin") {
    return <NotFound />;
  }

  return <Component />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route>
        <AuthGate>
          <FloatingChatButton />
          <LoadNotificationToast />
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route
                path="/loads"
                component={() => <ProtectedRoute component={Loads} requiredRole="admin" />}
              />
              <Route
                path="/finance"
                component={() => <ProtectedRoute component={Finance} requiredRole="admin" />}
              />
              <Route
                path="/partnership"
                component={() => <ProtectedRoute component={Partnership} requiredRole="admin" />}
              />
              <Route path="/driver" component={DriverViewProduction} />
              <Route path="/driver-legacy" component={DriverView} />
              <Route path="/driver-performance" component={DriverPerformance} />
              <Route path="/transactions" component={Transactions} />
              <Route path="/quotation" component={Quotation} />
              <Route
                path="/quotation-history"
                component={() => (
                  <ProtectedRoute component={QuotationHistory} requiredRole="admin" />
                )}
              />
              <Route path="/load-evaluator" component={LoadEvaluator} />
              <Route
                path="/import-broker-loads"
                component={() => (
                  <ProtectedRoute component={ImportBrokerLoads} requiredRole="admin" />
                )}
              />
              <Route
                path="/broker-loads-management"
                component={() => (
                  <ProtectedRoute component={BrokerLoadsManagement} requiredRole="admin" />
                )}
              />
              <Route
                path="/admin-contacts"
                component={() => <ProtectedRoute component={AdminContacts} requiredRole="admin" />}
              />
              <Route
                path="/realtime-dashboard"
                component={() => (
                  <ProtectedRoute component={RealtimeDashboard} requiredRole="admin" />
                )}
              />
              <Route
                path="/batch-payments-dashboard"
                component={() => (
                  <ProtectedRoute component={BatchPaymentsDashboard} requiredRole="admin" />
                )}
              />
              <Route
                path="/accounting-finance"
                component={() => (
                  <ProtectedRoute component={AccountingFinance} requiredRole="admin" />
                )}
              />
              <Route
                path="/executive-dashboard"
                component={() => (
                  <ProtectedRoute component={ExecutiveDashboard} requiredRole="admin" />
                )}
              />
              <Route
                path="/business-settings"
                component={() => (
                  <ProtectedRoute component={BusinessSettings} requiredRole="admin" />
                )}
              />
              <Route path="/tax-compliance" component={TaxCompliance} />
              <Route path="/chat" component={Chat} />
              <Route path="/profile" component={UserProfile} />
              <Route path="/about" component={About} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.014 240)",
                border: "1px solid oklch(0.22 0.015 240)",
                color: "oklch(0.95 0.005 240)",
              },
            }}
          />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
