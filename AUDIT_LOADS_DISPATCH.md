# AUDIT: Loads & Dispatch - Operations Core

**Objetivo:** Cerrar Loads & Dispatch de verdad. Verificar que todo el flujo funcione sin parches.

**Fecha:** 2026-04-06

---

## 1. TABLA `loads` - ESTRUCTURA DB

### Columnas Principales (28 total)
- ✅ `id` - PK autoincrement
- ✅ `clientName` - varchar(255)
- ✅ `pickupAddress` - text
- ✅ `deliveryAddress` - text
- ✅ `pickupLat`, `pickupLng` - decimal(10,7)
- ✅ `deliveryLat`, `deliveryLng` - decimal(10,7)
- ✅ `weight` - decimal(10,2)
- ✅ `weightUnit` - enum('lbs','kg','tons')
- ✅ `merchandiseType` - varchar(255)
- ✅ `price` - decimal(12,2)
- ✅ `estimatedIncome` - decimal(12,2)
- ✅ `estimatedFuel` - decimal(12,2)
- ✅ `estimatedTolls` - decimal(12,2)
- ✅ `totalMiles` - decimal(10,2)
- ✅ `status` - enum('available','quoted','assigned','in_transit','delivered','invoiced','paid')
- ✅ `assignedDriverId` - FK → users(id)
- ✅ `createdBy` - FK → users(id)
- ✅ `pickupDate`, `deliveryDate` - timestamp
- ✅ `rateConfirmationNumber` - varchar(100)
- ✅ `notes` - text
- ✅ `createdAt`, `updatedAt` - timestamp

**ESTADO:** ✅ ESTRUCTURA CORRECTA

---

## 2. ROUTER `loads` - PROCEDURES

### Procedures Existentes
- ✅ `loads.list` - Devuelve cargas con filtro opcional
- ✅ `loads.byId` - Devuelve detalle de una carga
- ✅ `loads.create` - Crea nueva carga
- ✅ `loads.update` - Actualiza carga
- ✅ `loads.getActive` - Devuelve cargas activas (usado por LoadsDispatch)

### Procedures FALTANTES
- ❌ `loads.updateStatus` - NO EXISTE. Necesario para cambiar estado en pipeline
- ❌ `loads.delete` - NO EXISTE. Necesario para eliminar cargas
- ❌ `loads.getByStatus` - NO EXISTE. Sería útil para filtros avanzados
- ❌ `loads.getByDriver` - NO EXISTE. Necesario para vista de driver

**ESTADO:** ⚠️ INCOMPLETO - Faltan 4 procedures críticos

---

## 3. LOADSDISPATCH.TSX - FRONTEND

### Tabs Implementados
- ✅ Load Board - Búsqueda, filtros, ordenamiento
- ✅ Pipeline - Visualización de 7 estados
- ✅ Analytics - Métricas de cargas completadas
- ✅ Stats - KPIs en tiempo real

### Funcionalidades
- ✅ Búsqueda por ubicación
- ✅ Filtro por status
- ✅ Ordenamiento (date, income, distance)
- ✅ Color coding por estado
- ✅ Stats (total, available, active, completed, totalIncome)

### Issues Potenciales
- ❌ No hay botón "Crear Nueva Carga" visible
- ❌ No hay modal de edición de carga
- ❌ No hay modal de cambio de estado
- ❌ No hay link a detalle de carga
- ⚠️ Usa `trpc.loads.getActive` que podría no devolver datos correctos

**ESTADO:** ⚠️ INCOMPLETO - Falta interactividad (crear, editar, cambiar estado)

---

## 4. LOAD DETAIL PAGE - RUTA /loads/:id

### Status
- ❌ NO EXISTE. Necesario para ver detalles completos de una carga
- ❌ No hay componente LoadDetailPage.tsx
- ❌ No hay ruta en App.tsx

**ESTADO:** ❌ NO IMPLEMENTADO

---

## 5. LOAD CREATION - CREAR NUEVA CARGA

### Status
- ✅ Existe `loads.create` procedure en backend
- ❌ No hay UI clara para crear carga desde LoadsDispatch
- ❌ No hay modal CreateLoadModal
- ⚠️ Existe CreateLoadModal pero no está integrado en LoadsDispatch

**ESTADO:** ⚠️ INCOMPLETO - Falta integración en UI

---

## 6. ESTADO PIPELINE - TRANSICIONES

### Estados Definidos
1. `available` - Carga disponible para asignar
2. `quoted` - Carga cotizada
3. `assigned` - Asignada a driver
4. `in_transit` - En tránsito
5. `delivered` - Entregada
6. `invoiced` - Facturada
7. `paid` - Pagada

### Transiciones
- ❌ NO HAY VALIDACIÓN de transiciones válidas
- ❌ NO HAY PROCEDURE `loads.updateStatus`
- ❌ NO HAY UI para cambiar estado
- ❌ NO HAY NOTIFICACIONES cuando cambia estado

**ESTADO:** ❌ NO IMPLEMENTADO

---

## 7. DASHBOARD.RECENTLOADS - INTEGRACIÓN

### Status
- ✅ Existe en CommandCenter.tsx
- ✅ Consume `trpc.loads.getActive`
- ✅ Muestra últimas cargas
- ⚠️ Puede estar mostrando datos incorrectos si `getActive` falla

**ESTADO:** ⚠️ DEPENDE DE VERIFICACIÓN DE `getActive`

---

## 8. QUERIES DB - PERFORMANCE

### Queries Principales
- ✅ `getLoads()` - Devuelve cargas con filtros
- ✅ `getLoadById()` - Devuelve detalle
- ✅ `createLoad()` - Crea nueva carga
- ✅ `updateLoad()` - Actualiza carga
- ❌ `updateLoadStatus()` - NO EXISTE
- ❌ `deleteLoad()` - Podría no existir

**ESTADO:** ⚠️ INCOMPLETO

---

## RESUMEN DE ISSUES

### CRÍTICOS (Bloquean operación)
1. ❌ NO EXISTE `loads.updateStatus` - No se puede cambiar estado
2. ❌ NO EXISTE Load Detail Page (/loads/:id)
3. ❌ NO EXISTE UI para cambiar estado en pipeline
4. ❌ NO EXISTE validación de transiciones de estado

### IMPORTANTES (Degradan UX)
5. ⚠️ LoadsDispatch no tiene botón "Crear Nueva Carga"
6. ⚠️ LoadsDispatch no tiene link a detalle de carga
7. ⚠️ LoadsDispatch no tiene modal de edición
8. ⚠️ No hay notificaciones cuando cambia estado

### MENORES (Nice to have)
9. ⚠️ No hay validación de transiciones inválidas
10. ⚠️ No hay historial de cambios de estado

---

## PLAN DE ACCIÓN

### FASE 1: Implementar Procedures Faltantes
1. Crear `loads.updateStatus` procedure
2. Crear `loads.delete` procedure
3. Crear `loads.getByDriver` procedure
4. Crear `loads.getByStatus` procedure

### FASE 2: Crear Load Detail Page
1. Crear LoadDetailPage.tsx
2. Agregar ruta en App.tsx
3. Integrar con `loads.byId`
4. Agregar UI para editar campos
5. Agregar UI para cambiar estado

### FASE 3: Implementar Estado Pipeline
1. Crear validación de transiciones
2. Crear UI para cambiar estado
3. Agregar notificaciones
4. Agregar historial de cambios

### FASE 4: Integrar en LoadsDispatch
1. Agregar botón "Crear Nueva Carga"
2. Agregar link a detalle de carga
3. Agregar modal de edición
4. Agregar modal de cambio de estado

### FASE 5: Verificar Dashboard.recentLoads
1. Verificar que `getActive` devuelve datos correctos
2. Verificar que se muestran correctamente en CommandCenter
3. Agregar link a detalle desde CommandCenter

---

## PRÓXIMOS PASOS

**Comenzar con FASE 1:** Implementar procedures faltantes en backend.

