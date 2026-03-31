import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import About from "./pages/About";

function DashboardTemp() {
  return (
    <DashboardLayout>
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h1>DASHBOARD TEMPORAL 1002</h1>
        <p>Si ves esto, layout + tRPC ya funcionan juntos.</p>
      </div>
    </DashboardLayout>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/about" component={About} />
      <Route path="/dashboard" component={DashboardTemp} />
    </Switch>
  );
}

export default App;
