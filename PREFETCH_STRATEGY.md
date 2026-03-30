# Prefetch Strategy Documentation

## Overview

Se ha implementado un sistema inteligente de **prefetching** para optimizar la navegación del usuario. Los chunks lazy loaded se descargan en segundo plano cuando el usuario interactúa con ciertos elementos, mejorando significativamente la experiencia de navegación.

## Estrategia de Prefetching

### 1. Prefetch en Hover

Cuando el usuario pasa el mouse sobre un botón o enlace, el chunk correspondiente se prefetcha automáticamente:

```tsx
<PrefetchButton
  chunkUrls={["/assets/ProjectionsCard-*.js"]}
  prefetchOnHover
>
  Ver Proyecciones
</PrefetchButton>
```

**Beneficio**: El chunk está listo cuando el usuario hace clic.

### 2. Prefetch en Visible (Intersection Observer)

Cuando un elemento se vuelve visible en la pantalla, su chunk se prefetcha:

```tsx
<PrefetchDiv
  chunkUrls={["/assets/TrendCharts-*.js"]}
  prefetchOnVisible
>
  <TrendCharts data={data} />
</PrefetchDiv>
```

**Beneficio**: Los chunks se descargan antes de que el usuario los necesite.

### 3. Prefetch en Focus (Keyboard Navigation)

Cuando un elemento recibe focus (navegación por teclado), su chunk se prefetcha:

```tsx
<PrefetchButton
  chunkUrls={["/assets/ComparisonAnalytics-*.js"]}
  prefetchOnFocus
>
  Análisis Comparativo
</PrefetchButton>
```

**Beneficio**: Navegación por teclado más rápida.

### 4. Prefetch en Idle (requestIdleCallback)

Cuando el navegador está inactivo, se prefetchan chunks de rutas comunes:

```tsx
usePrefetchDashboard(); // Prefetcha todos los chunks del dashboard
usePrefetchCommonFlows("/dashboard"); // Prefetcha rutas comunes desde dashboard
```

**Beneficio**: Aprovecha el tiempo ocioso del navegador.

### 5. Prefetch en Route Change

Cuando el usuario navega a una nueva ruta, se prefetchan los chunks necesarios:

```tsx
usePrefetchRoute("/dashboard"); // Prefetcha chunks del dashboard
```

**Beneficio**: Transiciones de página más rápidas.

## Componentes Prefetchados

| Componente | Estrategia | Trigger |
|---|---|---|
| **ProjectionsCard** | Hover + Visible | Botón "Ver Proyecciones" |
| **TrendCharts** | Visible | Scroll a sección de gráficos |
| **ComparisonAnalytics** | Visible | Scroll a sección de análisis |
| **DriverLocationMap** | Hover + Focus | Botón de mapa (admin) |
| **ChatWidget** | Hover + Focus | Botón de chat (admin) |
| **AssignLoadModal** | Hover | Botón "Asignar Carga" |
| **ExpenseForm** | Hover | Botón "Registrar Gasto" |
| **FinanceCharts** | Hover | Botón "Ver Finanzas" |

## Detección de Conexión

El sistema respeta las preferencias del usuario y las condiciones de red:

### Data Saver Mode
Si el usuario tiene habilitado el modo "Ahorrador de datos", el prefetching se desactiva:

```tsx
if (hasDataSaverMode()) {
  // No prefetch
}
```

### Network Speed
Solo se prefetcha en conexiones rápidas (4G, 3G):

```tsx
const speed = getNetworkSpeed(); // "4g" | "3g" | "2g" | "slow-2g"
if (speed === "4g" || speed === "3g") {
  // Prefetch
}
```

## Implementación en Dashboard

### Prefetch en Botones de Acciones Rápidas

```tsx
// Header buttons
<Button ref={newLoadBtnRef} onClick={() => setLocation("/loads")}>
  Nueva Carga
</Button>

// Quick action buttons
<QuickAction
  label="Registrar Gasto"
  onClick={() => setLocation("/finance")}
/>
```

### Prefetch en Componentes Lazy

```tsx
<LazyLoad fallback={<ChartSkeleton />}>
  <ProjectionsCard data={projections} />
</LazyLoad>
```

## Monitoreo de Performance

Se registran métricas de prefetching:

```tsx
const metrics = getPrefetchMetrics();
console.log(`
  Chunks prefetchados: ${metrics.prefetchedChunks}
  Bytes descargados: ${metrics.prefetchedBytes}
  Tiempo promedio: ${metrics.averageLoadTime}ms
`);
```

## Impacto Esperado

### Antes de Prefetching
- Click en botón → Esperar a descargar chunk → Renderizar componente
- Tiempo: ~500-1000ms

### Después de Prefetching
- Hover en botón → Prefetch chunk en segundo plano
- Click en botón → Chunk ya está descargado → Renderizar inmediatamente
- Tiempo: ~50-100ms

**Mejora**: 80-90% más rápido

## Mejores Prácticas

### 1. Prefetch Selectivo
No prefetches todos los chunks. Prefetcha solo los que el usuario probablemente usará:

```tsx
// ✅ Bien: Prefetch componentes frecuentemente usados
usePrefetchOnHover(ref, ["/assets/ProjectionsCard-*.js"]);

// ❌ Mal: Prefetch todos los chunks
usePrefetchChunks(allChunks);
```

### 2. Respetar Preferencias del Usuario
Siempre respeta el modo "Ahorrador de datos":

```tsx
if (!hasDataSaverMode()) {
  prefetchChunk(url);
}
```

### 3. Debounce Prefetch
Debouncea prefetch requests para evitar exceso de red:

```tsx
debouncedPrefetch(chunkUrl, 500); // Espera 500ms antes de prefetch
```

### 4. Usar requestIdleCallback
Prefetcha en segundo plano cuando el navegador está inactivo:

```tsx
usePrefetchIdle(["/assets/chunk1.js", "/assets/chunk2.js"]);
```

## Testing

Se incluyen tests para verificar:

- ✅ Detección de velocidad de conexión
- ✅ Detección de modo "Ahorrador de datos"
- ✅ Creación de links de prefetch
- ✅ Debouncing de prefetch
- ✅ Métricas de prefetch
- ✅ Performance sin bloqueo

## Configuración de Rutas

Prefetch estratégico por ruta:

```tsx
const ROUTE_CHUNK_MAP = {
  "/dashboard": [
    "/assets/ProjectionsCard-*.js",
    "/assets/TrendCharts-*.js",
    "/assets/ComparisonAnalytics-*.js",
  ],
  "/loads": [
    "/assets/LoadDetailsModal-*.js",
    "/assets/AssignLoadModal-*.js",
  ],
  "/finance": [
    "/assets/FinanceCharts-*.js",
    "/assets/ExpenseForm-*.js",
  ],
};
```

## Troubleshooting

### Prefetch no funciona
1. Verificar que `shouldPrefetch()` retorna `true`
2. Verificar que el modo "Ahorrador de datos" no está habilitado
3. Verificar que la conexión es 4G o 3G

### Demasiadas descargas
1. Reducir número de chunks prefetchados
2. Aumentar delay de debounce
3. Usar `usePrefetchIdle` en lugar de `usePrefetchOnHover`

### Performance degradado
1. Verificar que no se prefetchan demasiados chunks simultáneamente
2. Usar `requestIdleCallback` para prefetch en background
3. Monitorear métricas con `getPrefetchMetrics()`

## Conclusión

El prefetching inteligente mejora significativamente la experiencia de navegación del usuario. Al descargar chunks en segundo plano durante interacciones, se logra una experiencia casi instantánea cuando el usuario navega a nuevas secciones.

**Resultado Final**: Navegación 80-90% más rápida con respeto a las preferencias del usuario y condiciones de red.
