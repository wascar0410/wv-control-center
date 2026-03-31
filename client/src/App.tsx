import { Route, Switch } from "wouter";
import About from "./pages/About";

function App() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/about" component={About} />
      <Route path="/dashboard">
        <div style={{ padding: 40, fontFamily: "sans-serif" }}>
          <h1>DASHBOARD TEMPORAL</h1>
          <p>Si ves esto, la navegación ya funciona.</p>
        </div>
      </Route>
    </Switch>
  );
}

export default App;
