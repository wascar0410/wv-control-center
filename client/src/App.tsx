import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Loads from "./pages/Loads";
import Finance from "./pages/Finance";

function DashboardPage() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/about" component={About} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/loads" component={Loads} />
      <Route path="/finance" component={Finance} />
    </Switch>
  );
}
