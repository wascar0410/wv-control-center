# WV Control Center - TODO

## Fase 1: Base de Datos y Esquema
- [x] Esquema de tabla loads (cargas)
- [x] Esquema de tabla transactions (ingresos y gastos)
- [x] Esquema de tabla partnership (socios y retiros)
- [x] Esquema de tabla fuel_logs (registro de gasolina del chofer)
- [x] Esquema de tabla bol_documents (fotos BOL)
- [x] Ejecutar migraciones SQL

## Fase 2: Backend (tRPC Routers)
- [x] Router de cargas (CRUD + cambio de estado)
- [x] Router de finanzas (ingresos, gastos, balance)
- [x] Router de socios (configuración, distribución, retiros)
- [x] Router de chofer (rutas asignadas, gastos, BOL upload)
- [x] Alertas automáticas al propietario

## Fase 3: Tema y Layout
- [x] Modo oscuro configurado en ThemeProvider
- [x] Tipografía Inter desde Google Fonts
- [x] Variables CSS de color (paleta dark high-tech)
- [x] DashboardLayout con sidebar de navegación
- [x] Rutas registradas en App.tsx

## Fase 4: Módulo de Cargas
- [x] Formulario de nueva carga (cliente, puntos A/B, peso, mercancía)
- [x] Calculadora de rentabilidad (precio - combustible - peajes = margen neto)
- [x] Lista de cargas con filtros por estado
- [x] Cambio de estado de carga
- [x] Vista detalle de carga

## Fase 5: Panel de Finanzas
- [x] Registro de ingresos automático desde cargas pagadas
- [x] Formulario de registro de gastos con categorías
- [x] Gráfico de flujo de caja (Recharts)
- [x] Resumen mensual: ingresos, gastos, utilidad
- [x] Tabla de transacciones

## Fase 6: Módulo de Socios
- [x] Configuración de porcentaje de participación
- [x] Cálculo automático de distribución mensual
- [x] Formulario de registro de retiro (Owner's Draw)
- [x] Historial de retiros por socio
- [x] Resumen de nómina (payroll)

## Fase 7: Vista del Chofer
- [x] Lista de cargas asignadas al chofer
- [x] Mapa Google Maps con ruta punto A → punto B
- [x] Subida de foto BOL (almacenamiento S3)
- [x] Registro de gastos de gasolina en tiempo real
- [x] Vista responsiva móvil-first

## Fase 8: Dashboard Principal
- [x] KPIs: cargas activas, ingresos del mes, gastos del mes, utilidad
- [x] Cargas recientes
- [x] Alertas automáticas al propietario
- [x] Navegación completa entre módulos

## Fase 9: Tests y Entrega
- [x] Tests Vitest para routers principales (20/20 tests pasan)
- [x] Checkpoint guardado
- [x] Entrega al usuario

## Fase 10: Mejora de Fuel Logs y BOL Upload
- [x] Mejorar validación de archivos en backend (tamaño, tipo MIME)
- [x] Implementar almacenamiento S3 para BOL con URLs presignadas
- [x] Agregar validación de montos de gasolina (rango razonable)
- [x] Mejorar UX móvil: captura de cámara, preview de imagen, progreso de carga
- [x] Tests para fuel logs y BOL upload (12 tests nuevos, 33/33 total pasando)
- [x] Notificaciones al propietario cuando se sube BOL o registra gasto importante

## Fase 11: Asignación de Cargas del Gestor al Chofer
- [x] Actualizar esquema DB: tabla loadAssignments con relaciones
- [x] Crear routers tRPC: assignLoad, getAssignments, updateAssignmentStatus
- [x] Crear modal de asignación con búsqueda y filtros
- [x] Agregar vista de asignaciones en Dashboard del Gestor
- [x] Notificaciones al chofer cuando recibe asignación
- [x] Tests para asignación de cargas (8 tests nuevos)

## Fase 12: Diagnostico y Correcciones Finales
- [x] Error en /loads: "Cannot read properties of undefined (reading 'expenses')" — RESUELTO
- [x] Error en /partnership: "Cannot read properties of undefined (reading 'expenses')" — RESUELTO
- [x] Error 500 en finance.cashFlow — RESUELTO: Corregido desempaquetamiento de db.execute()
- [x] Google Maps cargándose múltiples veces — RESUELTO: agregada verificación global

## Fase 13: Vista del Chofer Mejorada
- [x] Diagnosticado: cargas no se mostraban porque assignedDriverId era NULL
- [x] Backend: getLoads() mejorado con parametro includeUnassigned
- [x] Frontend: DriverView.tsx con 3 tabs (Activas, Disponibles, Completadas)
- [x] UX: Mensajes claros indicando como aceptar cargas disponibles
- [x] Control de acceso por rol: Rutas protegidas (solo Admin ve Cargas, Finanzas, Socios)
- [x] Tests: 40/40 pasando
- [x] Checkpoint final guardado


## Bugs Actuales
- [x] Error 502 en servidor — RESUELTO: No había choferes registrados. Creado usuario de prueba "Juan Pérez" con rol driver
- [x] Modal de asignar carga no muestra choferes — RESUELTO: Mejorado mensaje cuando no hay choferes disponibles


## Fase 14: Sistema de Aceptación/Rechazo de Cargas
- [x] Actualizar esquema: tabla loadAssignments con estado (pending, accepted, rejected)
- [x] Backend: routers para accept y reject con validación de permisos
- [x] Vista del Chofer: botones de aceptar/rechazar en tab de Disponibles
- [x] Notificaciones al gestor cuando chofer acepta/rechaza
- [x] Tests para aceptación/rechazo de cargas (4 tests nuevos, 44/44 total pasando)
- [x] Checkpoint y entrega


## Fase 15: Comprobante de Entrega (POD) desde Vista de Carga
- [x] Actualizar esquema DB: tabla pod_documents
- [x] Backend: routers tRPC para uploadPOD y getPOD con S3 storage
- [x] Componente PODUploadModal con validación y preview
- [x] Integrar POD upload en vista de carga del chofer (botón en LoadCard)
- [x] Notificaciones al gestor cuando se sube POD
- [x] Tests para POD upload (10 tests nuevos, 54/54 total pasando)
- [x] Checkpoint y entrega


## Fase 16: Driver Performance Dashboard
- [x] Backend: queries para estadísticas del chofer (entregas, ingresos, gastos, eficiencia)
- [x] Backend: routers tRPC para getDriverStats, getDriverMonthlyTrends, getRecentDeliveries
- [x] Frontend: componentes para KPIs (entregas totales, ingresos, gastos, margen neto)
- [x] Frontend: gráficos de tendencias mensuales (Recharts)
- [x] Frontend: tabla de entregas recientes del chofer
- [x] Frontend: página DriverPerformance con layout responsivo
- [x] Navegación: agregar enlace en DashboardLayout (Desempeño)
- [x] Tests para driver stats (10 tests nuevos, 64/64 total pasando)
- [x] Checkpoint y entrega


## Fase 17: Seguimiento de Gastos e Ingresos (Manual + Automático)
- [x] Actualizar esquema DB: tabla bankAccounts, tabla transactionImports
- [x] Backend: queries para gestionar cuentas bancarias y transacciones importadas (16 queries)
- [x] Backend: routers tRPC para addManualTransaction, linkBankAccount, unlinkBankAccount, getImportedTransactions, etc.
- [x] Frontend: formulario AddTransactionModal para agregar gastos/ingresos manuales
- [x] Frontend: modal LinkBankAccountModal para conectar cuenta bancaria
- [x] Frontend: página de Transacciones con filtros (tipo, búsqueda, origen)
- [x] Frontend: tabla de transacciones con búsqueda y paginación
- [x] Integración bancaria: Plaid API instalado y configurado con credenciales
- [x] Tests para transacciones manuales y automáticas (10 tests nuevos, 74/74 total pasando)
- [x] Checkpoint y entrega


## Fase 18: Sistema de Cotización de Cargas (Distancia, Millas, Peso, Rentabilidad)
- [x] Actualizar esquema DB: tabla loadQuotations con 30 campos de tarificación
- [x] Backend: queries para cálculos de distancia, tarificación por milla/peso (8 queries)
- [x] Backend: routers tRPC para calculateQuotation, getQuotation, getMyQuotations, updateQuotation, deleteQuotation, getQuotationsByStatus
- [x] Frontend: componente QuotationForm con ubicación van, recogida, entrega
- [x] Frontend: cálculos con Haversine formula (millas vacías, cargadas, retorno)
- [x] Frontend: componente QuotationResults con análisis de rentabilidad
- [x] Frontend: página Quotation con formulario y resultados
- [x] Tests para sistema de cotización (10 tests nuevos, 84/84 total pasando)
- [x] Checkpoint y entrega


## Fase 19: Integración Google Maps Geocoding API
- [x] Backend: crear helper para geocoding de direcciones (geocodeAddress, reverseGeocodeCoordinates)
- [x] Backend: agregar tRPC router para geocodeAddress y validateCoordinates
- [x] Frontend: componente AddressInput con búsqueda y autocompletado
- [x] Frontend: integrar AddressInput en QuotationForm para van, recogida y entrega
- [x] Frontend: actualizar QuotationForm para usar AddressInput (elimina entrada manual de coordenadas)
- [x] Tests para geocoding (10 tests nuevos, 95/95 total pasando)
- [x] Checkpoint y entrega


## Fase 20: Integración Google Routes API (Distancia y Tiempo Real)
- [x] Backend: crear helper para Google Routes API (calculateRoute, calculateMultipleRoutes)
- [x] Backend: agregar tRPC router para calculateRoute y calculateMultipleRoutes
- [x] Backend: actualizar quotationRouter para usar Routes en lugar de Haversine
- [x] Frontend: actualizar QuotationResults para mostrar tiempo de conducción
- [x] Frontend: agregar indicador de tiempo estimado en QuotationForm
- [x] Tests para Google Routes API (12 tests nuevos, 107/107 total pasando)
- [x] Checkpoint y entrega


## Fase 21: Optimización de Rutas con Múltiples Paradas
- [x] Backend: actualizar esquema para tabla route_stops (14 campos)
- [x] Backend: crear algoritmo de optimización de rutas (Nearest Neighbor + 2-opt local search)
- [x] Backend: agregar 8 queries para gestionar múltiples paradas
- [x] Backend: crear tRPC router multiStopRouter con 3 procedimientos
- [x] Frontend: componente StopsList para agregar/editar paradas
- [x] Frontend: componente RouteOptimizer para visualizar orden optimizado
- [x] Frontend: integrar en QuotationForm para soportar múltiples paradas
- [x] Tests para optimización de rutas (10 tests nuevos, 117/117 total pasando)
- [x] Checkpoint y entrega


## Fase 22: Correcciones y Mejoras
- [x] Investigar y resolver error de permisos de Google Maps (mejorado manejo de errores en geocoding.ts)
- [x] Unificar ventanas de cotización y creación de carga (CreateLoadModal integrado en Quotation page)
- [x] Crear carga automáticamente después de confirmar cotización (modal con datos pre-llenados)
- [x] Usar tRPC router existente loads.create para crear carga desde cotización
- [x] Tests para nuevo flujo integrado (117/117 tests pasando)
- [x] Checkpoint y entrega
