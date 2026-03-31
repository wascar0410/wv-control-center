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
import { BatchPayments } from "./pages/BatchPayments";
import { BatchPaymentsDashboard } from "./pages/BatchPaymentsDashboard";
import AccountingFinance from "./pages/AccountingFinance";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import BusinessSettings from "./pages/BusinessSettings";
import LoadEvaluator from "./pages/LoadEvaluator";
import TaxCompliance from "./pages/TaxCompliance";
import { Chat } from "./pages/Chat";
import UserProfile from "./pages/UserProfile";
import About from "./pages/About";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminContacts } from "./pages/AdminContacts";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RealtimeDashboard } from "./pages/RealtimeDashboard";
import { FloatingChatButton } from "./components/FloatingChatButton";
import { LoadNotificationToast } from "./components/LoadNotificationToast";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2 } from "lucide-react";

function AuthGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png"
                alt="WV Control Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Cargando WV Control Center...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png"
                alt="WV Control Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">WV Control Center</h1>
              <p className="text-sm text-muted-foreground mt-1">WV Transport, LLC</p>
            </div>
          </div>

          {/* Login card */}
          <div className="w-full bg-card border border-border rounded-2xl p-8 flex flex-col gap-6 shadow-xl">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Acceder al Panel</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Inicia sesión para gestionar operaciones, finanzas y socios.
              </p>
            </div>
            <a
              href={getLoginUrl()}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary/20"
            >
              Iniciar Sesión
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Plataforma de gestión interna para WV Transport, LLC
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: 'admin' | 'user' | 'driver' }) {
  const { user } = useAuth();
  
  // Owner has access to everything
  if (user?.role === 'owner') {
    return <Component />;
  }
  
  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <NotFound />;
  }
  if (requiredRole === 'driver' && user?.role !== 'driver' && user?.role !== 'admin') {
    return <NotFound />;
  }
  
  return <Component />;
}

function AppRoutes() {
  return (
    <>
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
                <Route path="/loads" component={() => <ProtectedRoute component={Loads} requiredRole="admin" />} />
                <Route path="/finance" component={() => <ProtectedRoute component={Finance} requiredRole="admin" />} />
                <Route path="/partnership" component={() => <ProtectedRoute component={Partnership} requiredRole="admin" />} />
                <Route path="/driver" component={DriverViewProduction} />
                <Route path="/driver-legacy" component={DriverView} />
                <Route path="/driver-performance" component={DriverPerformance} />
                <Route path="/transactions" component={Transactions} />
                <Route path="/quotation" component={Quotation} />
                <Route path="/quotation-history" component={() => <ProtectedRoute component={QuotationHistory} requiredRole="admin" />} />
                <Route path="/load-evaluator" component={LoadEvaluator} />
                <Route path="/import-broker-loads" component={() => <ProtectedRoute component={ImportBrokerLoads} requiredRole="admin" />} />
                <Route path="/broker-loads-management" component={() => <ProtectedRoute component={BrokerLoadsManagement} requiredRole="admin" />} />
                <Route path="/admin-contacts" component={() => <ProtectedRoute component={AdminContacts} requiredRole="admin" />} />
                <Route path="/realtime-dashboard" component={() => <ProtectedRoute component={RealtimeDashboard} requiredRole="admin" />} />
                <Route path="/batch-payments-dashboard" component={() => <ProtectedRoute component={BatchPaymentsDashboard} requiredRole="admin" />} />
                <Route path="/accounting-finance" component={() => <ProtectedRoute component={AccountingFinance} requiredRole="admin" />} />
                <Route path="/executive-dashboard" component={() => <ProtectedRoute component={ExecutiveDashboard} requiredRole="admin" />} />
                <Route path="/business-settings" component={() => <ProtectedRoute component={BusinessSettings} requiredRole="admin" />} />
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
    </>
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
