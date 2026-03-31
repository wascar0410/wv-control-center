import { Route, Switch } from "wouter";

function App() {
  return (
    <Switch>
      <Route path="/">
        <div style={{ padding: 40, fontFamily: "sans-serif" }}>
          <h1>APP FUNCIONANDO</h1>
          <p>Si ves esto y no rebota, el problema está en layout, auth o páginas.</p>
        </div>
      </Route>
    </Switch>
  );
}

export default App;
