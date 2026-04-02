# Cálculo de Cargas según Millas - WV Control Center

## 📊 Resumen Ejecutivo

El sistema calcula el precio de una carga basándose en:
1. **Distancia (millas)** - Desde pickup a delivery
2. **Peso (libras)** - Del cargo
3. **Costos operativos** - Combustible, mantenimiento, seguros
4. **Sobrecargas (surcharges)** - Por distancia y peso
5. **Ganancia mínima** - Profit por milla

---

## 🔢 Fórmula Principal de Cálculo

```
PRECIO TOTAL = (Millas Cargadas × Tasa por Milla) + Sobrecargas
```

### Desglose Detallado:

```
PRECIO FINAL = 
  (Millas Cargadas × Tasa Base por Milla) +
  (Millas Cargadas × Sobrecarga por Distancia) +
  (Peso × Sobrecarga por Peso) +
  (Millas Totales × Costo Combustible) +
  (Millas Totales × Costo Operativo) +
  (Millas Totales × Costo Fijo)
```

---

## 📐 Cálculo de Distancia

### Método 1: Fórmula Haversine (Coordenadas)

Si tienes latitud/longitud del pickup y delivery:

```typescript
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Radio de la Tierra en millas
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Resultado en millas
}
```

**Ejemplo:**
```
Miami (25.7617, -80.1918) → Tampa (27.9506, -82.4572)
Distancia = ~220 millas
```

### Método 2: Google Routes API

Si usas direcciones de texto:

```typescript
const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
  params: {
    origins: "Miami, FL",
    destinations: "Tampa, FL",
    units: "imperial", // millas
    key: GOOGLE_MAPS_API_KEY
  }
});

const distanceMeters = response.data.rows[0].elements[0].distance.value;
const distanceMiles = distanceMeters / 1609.34;
```

---

## 💰 Componentes de Costo

### 1. Costo de Combustible

```
Costo Combustible = (Millas Totales) × (Precio Galón / MPG)
```

**Valores por Defecto:**
- Precio por Galón: $3.60
- MPG del Van: 18 millas/galón
- **Costo por Milla: $3.60 / 18 = $0.20 por milla**

**Ejemplo:**
```
Viaje de 220 millas:
Costo Combustible = 220 × $0.20 = $44.00
```

### 2. Costo de Mantenimiento

```
Costo Mantenimiento = Millas Totales × $0.12 por milla
```

**Incluye:**
- Cambios de aceite
- Reparaciones
- Inspecciones

**Ejemplo:**
```
220 millas × $0.12 = $26.40
```

### 3. Costo de Llantas

```
Costo Llantas = Millas Totales × $0.03 por milla
```

**Ejemplo:**
```
220 millas × $0.03 = $6.60
```

### 4. Costo Operativo Total

```
Costo Operativo = Combustible + Mantenimiento + Llantas
Costo Operativo = $0.20 + $0.12 + $0.03 = $0.35 por milla
```

**Ejemplo:**
```
220 millas × $0.35 = $77.00
```

### 5. Costos Fijos Mensuales

```
Costos Fijos Mensuales = 
  Seguros ($450) +
  Teléfono/Internet ($70) +
  Apps de Carga ($45) +
  Software Contable ($30) +
  Otros ($80)
  = $675 por mes
```

**Costo Fijo por Milla:**
```
Costo Fijo por Milla = $675 / 4000 millas (meta mensual)
                     = $0.169 por milla
```

**Ejemplo:**
```
220 millas × $0.169 = $37.18
```

---

## 🎯 Sobrecargas (Surcharges)

### Sobrecarga por Distancia

Se aplica según las millas cargadas (no millas vacías):

```
Tabla Típica de Sobrecargas por Distancia:
- 0 a 250 millas:    $0.00 por milla
- 251 a 500 millas:  $0.08 por milla
- 501 a 900 millas:  $0.18 por milla
- 901+ millas:       $0.30 por milla
```

**Ejemplo:**
```
Carga de 220 millas cargadas → Sobrecarga = $0.00
Carga de 350 millas cargadas → Sobrecarga = $0.08 × 350 = $28.00
Carga de 600 millas cargadas → Sobrecarga = $0.18 × 600 = $108.00
```

### Sobrecarga por Peso

Se aplica según el peso del cargo:

```
Tabla Típica de Sobrecargas por Peso:
- 0 a 1,500 lbs:     $0.00 por milla
- 1,501 a 2,500 lbs: $0.04 por milla
- 2,501 a 3,200 lbs: $0.08 por milla
- 3,201+ lbs:        $0.14 por milla
```

**Ejemplo:**
```
Carga de 2,000 lbs → Sobrecarga = $0.04 × millas cargadas
Carga de 3,000 lbs → Sobrecarga = $0.08 × millas cargadas
```

---

## 📈 Cálculo de Ganancia Mínima

### Ganancia Mínima por Milla

```
Ganancia Mínima por Milla = $1.50 (configurable)
```

**Esto significa:**
- Por cada milla cargada, necesitas ganar mínimo $1.50
- Si una carga es de 220 millas, necesitas mínimo: 220 × $1.50 = $330.00

### Fórmula de Tasa por Milla

```
Tasa por Milla = (Ganancia Mínima + Costos Operativos + Sobrecargas) / Millas Cargadas
```

---

## 🧮 Ejemplo Completo de Cálculo

### Datos de la Carga:
```
Pickup:    Miami, FL (25.7617, -80.1918)
Delivery:  Tampa, FL (27.9506, -82.4572)
Peso:      2,000 lbs
Millas:    220 millas
```

### Paso 1: Calcular Distancia
```
Usando Haversine: 220 millas
```

### Paso 2: Calcular Costos Operativos
```
Combustible:     220 × $0.20 = $44.00
Mantenimiento:   220 × $0.12 = $26.40
Llantas:         220 × $0.03 = $6.60
Costos Fijos:    220 × $0.169 = $37.18
─────────────────────────────
Total Costos:                  $114.18
```

### Paso 3: Calcular Sobrecargas
```
Sobrecarga Distancia: 220 millas (0-250) = $0.00
Sobrecarga Peso:      2,000 lbs (1,501-2,500) = $0.04 × 220 = $8.80
─────────────────────────────
Total Sobrecargas:                           $8.80
```

### Paso 4: Calcular Ganancia Mínima
```
Ganancia Mínima = 220 millas × $1.50 = $330.00
```

### Paso 5: Calcular Precio Total
```
PRECIO = Costos + Sobrecargas + Ganancia Mínima
PRECIO = $114.18 + $8.80 + $330.00
PRECIO = $452.98
```

### Paso 6: Calcular Tasa por Milla
```
Tasa por Milla = $452.98 / 220 = $2.06 por milla
```

---

## 📊 Análisis de Rentabilidad

### Métricas Clave:

```
Tasa por Milla Cargada:    $2.06
Costo Operativo por Milla: $0.52
Ganancia por Milla:        $1.54
Margen de Ganancia:        74.8%
```

### Veredicto de Carga:

```
Si Tasa por Milla ≥ $2.00 → ACEPTAR ✅
Si Tasa por Milla $1.50-$2.00 → NEGOCIAR 🤔
Si Tasa por Milla < $1.50 → RECHAZAR ❌
```

En este ejemplo: **ACEPTAR** (tasa de $2.06)

---

## 🔧 Archivos Clave en el Código

### 1. **quotationRouter.ts** - Cálculo Principal
```typescript
// Línea 15-28: Función Haversine para distancia
// Línea 31-97: Función calculateProfitability
// Línea 100+: Endpoint calculateQuotation
```

**Ubicación:** `/home/ubuntu/wv-control-center/server/_core/quotationRouter.ts`

### 2. **db-business-config.ts** - Configuración de Costos
```typescript
// Línea 116-129: getApplicableDistanceSurcharge
// Línea 133-143: getApplicableWeightSurcharge
```

**Ubicación:** `/home/ubuntu/wv-control-center/server/db-business-config.ts`

### 3. **routes.ts** - Cálculo de Rutas
```typescript
// Línea 20-83: calculateMultipleRoutes
// Línea 114-144: Cálculo de millas vacías, cargadas, retorno
```

**Ubicación:** `/home/ubuntu/wv-control-center/server/_core/routes.ts`

### 4. **geocoding.ts** - Geocodificación
```typescript
// Línea 132-140: calculateDistanceFromCoordinates
```

**Ubicación:** `/home/ubuntu/wv-control-center/server/_core/geocoding.ts`

---

## 🔄 Flujo Completo en la App

```
1. Usuario ingresa:
   - Dirección de Pickup
   - Dirección de Delivery
   - Peso del cargo
   - Tasa deseada por milla (opcional)

2. Sistema calcula:
   - Distancia (Haversine o Google Maps)
   - Millas cargadas, vacías, retorno
   - Costos operativos
   - Sobrecargas aplicables

3. Sistema genera:
   - Precio recomendado
   - Tasa por milla
   - Análisis de rentabilidad
   - Veredicto (Aceptar/Negociar/Rechazar)

4. Usuario decide:
   - Aceptar precio recomendado
   - Negociar tasa
   - Rechazar carga
```

---

## 📱 Endpoint tRPC para Calcular Quotation

```typescript
// Frontend
const quotation = await trpc.quotation.calculateQuotation.mutate({
  pickupLat: 25.7617,
  pickupLng: -80.1918,
  deliveryLat: 27.9506,
  deliveryLng: -82.4572,
  weightLbs: 2000,
  ratePerMile: 2.00 // opcional
});

// Respuesta
{
  totalPrice: 452.98,
  ratePerLoadedMile: 2.06,
  estimatedProfit: 338.80,
  profitMarginPercent: 74.8,
  verdict: "ACEPTAR",
  distanceSurcharge: 0.00,
  weightSurcharge: 8.80
}
```

---

## 🎛️ Configuración Personalizable

Todos estos valores se pueden personalizar en la tabla `businessConfig`:

```sql
SELECT * FROM business_config WHERE userId = ?;
```

**Campos Configurables:**
- `fuelPricePerGallon` - Precio actual del combustible
- `vanMpg` - Rendimiento del van
- `maintenancePerMile` - Costo de mantenimiento
- `tiresPerMile` - Costo de llantas
- `insuranceMonthly` - Seguro mensual
- `phoneInternetMonthly` - Teléfono/Internet
- `loadBoardAppsMonthly` - Apps de carga
- `accountingSoftwareMonthly` - Software contable
- `otherFixedMonthly` - Otros costos fijos
- `targetMilesPerMonth` - Meta de millas mensuales
- `minimumProfitPerMile` - Ganancia mínima por milla

---

## 📊 Comparación de Escenarios

### Escenario 1: Carga Corta (100 millas)
```
Costos Operativos: $35.00
Sobrecargas: $0.00
Ganancia Mínima: $150.00
PRECIO TOTAL: $185.00
Tasa por Milla: $1.85
Veredicto: NEGOCIAR
```

### Escenario 2: Carga Larga (500 millas)
```
Costos Operativos: $175.00
Sobrecargas: $90.00 (distancia)
Ganancia Mínima: $750.00
PRECIO TOTAL: $1,015.00
Tasa por Milla: $2.03
Veredicto: ACEPTAR
```

### Escenario 3: Carga Pesada (3,500 lbs, 300 millas)
```
Costos Operativos: $105.00
Sobrecargas: $42.00 (peso)
Ganancia Mínima: $450.00
PRECIO TOTAL: $597.00
Tasa por Milla: $1.99
Veredicto: NEGOCIAR
```

---

## 🚀 Optimizaciones Implementadas

1. **Cálculo Automático** - No requiere entrada manual de millas
2. **Múltiples Rutas** - Considera pickup → delivery → retorno
3. **Sobrecargas Inteligentes** - Se aplican automáticamente según reglas
4. **Análisis de Rentabilidad** - Muestra ganancia esperada
5. **Alertas de Precio** - Notifica si está por debajo de mínimo

---

## 📝 Notas Importantes

- **Millas Cargadas** = Distancia de pickup a delivery
- **Millas Vacías** = Distancia de van a pickup (ida) + delivery a destino (retorno)
- **Millas Totales** = Cargadas + Vacías
- **Sobrecargas** = Se aplican solo a millas cargadas
- **Costos Operativos** = Se aplican a todas las millas

---

**Última Actualización:** 2026-03-31
**Versión:** 1.0
