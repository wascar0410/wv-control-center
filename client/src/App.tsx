import { Route, Switch } from "wouter";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
