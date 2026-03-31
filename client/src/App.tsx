import { Route, Switch } from "wouter";
import About from "./pages/About";

function DashboardTemp() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>DASHBOARD TEMPORAL</h1>
      <p>Si ves esto, la navegación ya funciona.</p>
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
