import { Route, Switch } from "wouter";

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
    <div style={{ padding: 24 }}>
      <h1>BUSINESS SETTINGS INLINE TEST 999</h1>
      <p>Si ves esto, la ruta funciona.</p>
    </div>
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
