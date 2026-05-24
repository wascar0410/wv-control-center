import { Router, Route, Redirect } from "wouter";
import { Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRouteForRole, logRouteGuardDecision } from "@/lib/routeUtils";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { withRoleGuard, withSuspense } from "@/lib/routeGuards";

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DriverPage = lazy(() => import("@/pages/DriverPage"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Team = lazy(() => import("@/pages/Team"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const FinanceDashboard = lazy(() => import("@/pages/FinanceDashboard"));
const DispatchBoard = lazy(() => import("@/pages/DispatchBoard"));
const LoadAnalyzer = lazy(() => import("@/pages/LoadAnalyzer"));
const Quotation = lazy(() => import("@/pages/Quotation"));
const Partners = lazy(() => import("@/pages/Partners"));
const Settings = lazy(() => import("@/pages/Settings"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const BankAccounts = lazy(() => import("@/pages/BankAccounts"));
const PlaidIntegration = lazy(() => import("@/pages/PlaidIntegration"));
const Reports = lazy(() => import("@/pages/Reports"));
const AddDriver = lazy(() => import("@/pages/AddDriver"));
const Profile = lazy(() => import("@/pages/Profile"));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<DashboardLayoutSkeleton />}>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" component={withSuspense(LoginPage)} />
        <Route path="/home" component={withSuspense(Home)} />

        {/* ===== DRIVER ROUTES ===== */}
        <Route path="/driver" component={withRoleGuard(DriverPage, ["driver"])} />
        <Route path="/finance-wallet" component={withRoleGuard(Wallet, ["driver"])} />
        <Route path="/profile" component={withSuspense(Profile)} />

        {/* ===== OWNER/ADMIN ROUTES ===== */}
        <Route path="/command-center" component={withRoleGuard(CommandCenter, ["owner", "admin"])} />
        <Route path="/team" component={withRoleGuard(Team, ["owner", "admin"])} />
        <Route path="/wallet" component={withRoleGuard(Wallet, ["owner", "admin"])} />
        <Route path="/finance-dashboard" component={withRoleGuard(FinanceDashboard, ["owner", "admin"])} />
        <Route path="/dispatch-board" component={withRoleGuard(DispatchBoard, ["owner", "admin"])} />
        <Route path="/load-analyzer" component={withRoleGuard(LoadAnalyzer, ["owner", "admin"])} />
        <Route path="/quotation" component={withRoleGuard(Quotation, ["owner", "admin"])} />
        <Route path="/partners" component={withRoleGuard(Partners, ["owner", "admin"])} />
        <Route path="/settings" component={withRoleGuard(Settings, ["owner", "admin"])} />
        <Route path="/admin" component={withRoleGuard(AdminPanel, ["owner", "admin"])} />
        <Route path="/bank-accounts" component={withRoleGuard(BankAccounts, ["owner", "admin"])} />
        <Route path="/plaid" component={withRoleGuard(PlaidIntegration, ["owner", "admin"])} />
        <Route path="/reports" component={withRoleGuard(Reports, ["owner", "admin"])} />
        <Route path="/drivers/add" component={withRoleGuard(AddDriver, ["owner", "admin"])} />

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
              const debugInfo = {
                component: 'RootRedirect',
                path: location.pathname,
                loading: isLoading,
                userEmail: user?.email || 'undefined',
                userRole: user?.role || 'undefined',
                computedDefaultRoute: defaultRoute,
                willRedirectTo: defaultRoute
              };
              if (typeof window !== 'undefined') {
                (window as any).__rootRedirectDebug = debugInfo;
                console.log('ROOT REDIRECT DEBUG:', debugInfo);
              }
              
              return (
                <div style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  backgroundColor: '#1a1a1a',
                  color: '#00ff00',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  zIndex: 9999,
                  border: '3px solid #00ff00',
                  maxWidth: '600px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
                }}>
                  <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>🔍 ROOT REDIRECT DEBUG</div>
                  <div>component: "RootRedirect"</div>
                  <div>path: "{location.pathname}"</div>
                  <div>loading: {isLoading}</div>
                  <div>userEmail: "{user?.email || 'undefined'}"</div>
                  <div>userRole: "{user?.role || 'undefined'}"</div>
                  <div>computedDefaultRoute: "{defaultRoute}"</div>
                  <div>willRedirectTo: "{defaultRoute}"</div>
                  <div style={{ marginTop: '15px', fontSize: '12px', color: '#ffff00', fontWeight: 'bold' }}>⏱️ Redirecting in 10 seconds...</div>
                </div>
              );
            }
            
            return <Redirect to={defaultRoute} />;
          }}
        </Route>
        <Route>
          {() => {
            const { user, loading: isLoading } = useAuth();
            const showDebug = typeof localStorage !== 'undefined' && localStorage.getItem('debugRoleRedirect') === '1';
            
            if (isLoading) {
              return <PageLoader />;
            }
            
            if (!user) {
              return <Redirect to="/login" />;
            }
            
            const defaultRoute = getDefaultRouteForRole(user);
            
            if (showDebug) {
              const debugInfo = {
                component: 'RootRedirect',
                path: '/',
                loading: isLoading,
                userEmail: user?.email,
                userRole: user?.role,
                computedDefaultRoute: defaultRoute,
                willRedirectTo: defaultRoute
              };
              window.__rootRedirectDebug = debugInfo;
              
              return (
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#fff',
                  border: '2px solid #f00',
                  padding: '20px',
                  borderRadius: '8px',
                  zIndex: 9999,
                  maxWidth: '500px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6'
                }}>
                  <h2 style={{ marginTop: 0, color: '#f00' }}>ROOT REDIRECT DEBUG</h2>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                  <button onClick={() => {
                    localStorage.removeItem('debugRoleRedirect');
                    window.location.href = defaultRoute;
                  }} style={{
                    marginTop: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    Continue to {defaultRoute}
                  </button>
                </div>
              );
            }
            
            return <Redirect to={defaultRoute} />;
          }}
        </Route>
      </Suspense>
    </Router>
  );
}
