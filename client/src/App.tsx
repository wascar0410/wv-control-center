import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import BusinessSettings from "./pages/BusinessSettings";

function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>HOME TEST 999</h1>
      <p>Si ves esto, App.tsx nuevo sí está cargando.</p>
    </div>
  );
}

function BusinessSettingsPage() {
  return (
    <DashboardLayout>
      <BusinessSettings />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/business-settings" component={BusinessSettingsPage} />
    </Switch>
  );
}
