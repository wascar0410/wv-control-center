import { Route, Switch } from "wouter";
import About from "./pages/About";

function DashboardTemp() {
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>DASHBOARD TEMPORAL 1001</h1>
      <p>Si ves esto, el panel básico ya funciona sin tRPC.</p>
    </div>
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
