import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import About from "./pages/About";

function DashboardTemp() {
  return (
    <DashboardLayout>
      <div style={{ padding: 24 }}>
        <h1>DASHBOARD TEMPORAL</h1>
        <p>Si ves esto sin rebote, el layout ya está estable.</p>
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
