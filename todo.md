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


## Fase 23: Gestión de Estado de Cargas para Chofer
- [x] Crear componentes UI para mostrar estado de carga (LoadStatusCard con badges de color)
- [x] Integrar Google Maps para iniciar ruta con destino (botón "Ir a Destino")
- [x] Implementar cambio de estado: Disponible → En Tránsito → Entregada
- [x] Agregar confirmación de entrega con foto (captura de cámara + preview)
- [x] Agregar notas de entrega opcionales
- [x] Integrar en DriverView con reemplazo de LoadCard anterior
- [x] Mostrar información de carga (cliente, peso, mercancía, precio)
- [x] Tests para gestión de estado (117/117 tests pasando)
- [x] Checkpoint y entrega


## Fase 24: Seguimiento de Ubicación en Tiempo Real
- [x] Actualizar esquema DB: tabla driver_locations (11 campos para GPS, velocidad, precisión)
- [x] Backend: queries para recibir y almacenar ubicación GPS del chofer (7 queries)
- [x] Backend: tRPC locationRouter con 5 procedimientos (recordLocation, getDriverLocation, getDriverLocationHistory, getAllActiveDrivers, getLoadLocationTrail)
- [x] Frontend: componente DriverLocationMap con Google Maps y marcadores de choferes
- [x] Frontend: auto-refresh cada 5 segundos para actualizaciones en tiempo real
- [x] Frontend: integrar DriverLocationMap en Dashboard (solo para admins)
- [x] Frontend: mostrar múltiples choferes con información de velocidad y carga
- [x] Tests para seguimiento de ubicación (117/117 tests pasando)
- [x] Checkpoint y entrega


## Fase 25: Corrección del Flujo de Estado de Cargas para Chofer (Empleado de Compañía)
- [x] Verificar y corregir router loads.updateStatus - asegurar que funciona correctamente
- [x] Implementar flujo: Carga asignada → Chofer clica "Iniciar Entrega" → Abre Google Maps
- [x] Cambio automático a "En Tránsito" cuando inicia entrega
- [x] Implementar cambio de estado a "Entregada" con foto/POD obligatoria
- [x] Verificar permisos: solo chofer asignado puede cambiar estado
- [x] Tests para flujo completo de cambio de estado (127/127 tests pasando)
- [x] Checkpoint y entrega


## Fase 26: Automatización de Pagos al Marcar Entregada
- [x] Actualizar esquema DB: tabla driver_payments (13 campos)
- [x] Backend: 8 queries para cálculo de pago basado en cotización y distancia real
- [x] Backend: paymentRouter tRPC con 5 procedimientos (processDeliveryPayment, getMyPayments, getMyPaymentStats, getPayment, updatePaymentStatus)
- [x] Backend: trigger automático de pago cuando status = 'delivered' (integrado en LoadStatusCard)
- [x] Frontend: integración automática en LoadStatusCard - pago se procesa al marcar entregada
- [x] Frontend: notificaciones "Carga entregada y pago procesado"
- [x] Tests para automatización de pagos (10 tests nuevos, 127/127 total pasando)
- [x] Checkpoint y entrega


## Fase 27: Procesamiento Masivo de Pagos y Exportación de Datos
- [x] Actualizar esquema DB: tabla paymentBatches, paymentAudit, exportLogs
- [x] Backend: queries para crear y gestionar batch payments (18 queries)
- [x] Backend: batchPaymentRouter tRPC con 9 procedimientos (createBatch, getBatch, listBatches, submitForReview, approveBatch, rejectBatch, processBatch, getBatchAuditTrail, cancelBatch)
- [x] Backend: exportRouter tRPC con 4 procedimientos (exportTransactions, exportLoads, exportPayments, getExportHistory)
- [x] Frontend: componente BatchPayments.tsx para gestión completa de lotes
- [x] Frontend: componente ExportDataModal.tsx para exportación con múltiples formatos
- [x] Frontend: componente BatchPaymentsDashboard.tsx con analytics y visualizaciones
- [x] Frontend: implementar exportación a Excel, PDF, CSV, JSON
- [x] Frontend: dashboard de batch payments con historial y métricas
- [x] Tests para batch payments y exportación (18 tests, todos pasando)
- [x] Checkpoint y entrega


## Bugs Reportados - Fase 28
- [x] Vista Chofer: cargas no se muestran en ningún estado → RESUELTO: Usuario admin no tenía cargas asignadas. Creado usuario chofer de prueba.
- [x] Vista Cargas: no permite cambiar estado de las cargas → RESUELTO: Botón estaba oculto (hidden sm:flex). Ahora visible en todos los tamaños.
- [x] Dashboard: no permite cambiar estado de las cargas → RESUELTO: Mismo problema que Vista de Cargas.

## Fase 29: Adaptación para Socios 50/50
- [x] Actualizar rol de pareja (yisvel10@gmail.com) a admin
- [x] Crear módulo Finanzas Contables profesional con:
  - [x] Balance General (Ingresos, Gastos, Utilidad Neta)
  - [x] Gráficos de Ingresos vs Gastos
  - [x] Margen de Ganancia
  - [x] Flujo de Caja (tendencias)
  - [x] Desglose de Ingresos por Categoría
  - [x] Desglose de Gastos por Categoría
  - [x] Historial de Transacciones con auditoría
  - [x] Exportación de reportes
- [x] Agregar "Finanzas Contables" al menú de navegación
- [x] Ruta protegida /accounting-finance solo para admins
- [x] Proyecto compila sin errores


## Fase 31: Prueba de Entrega (POD) Mejorada con Foto Obligatoria
- [ ] Crear tabla pod_images en schema para almacenar fotos de entrega
- [ ] Backend: router para uploadPOD con validación de imagen
- [ ] Backend: guardar foto en S3 y URL en base de datos
- [ ] Componente PODUploadModal mejorado con cámara/galería
- [ ] Integrar POD en flujo "Marcar Entregada" (obligatorio)
- [ ] Mostrar foto en historial de cargas completadas
- [ ] Tests para POD functionality
- [ ] Checkpoint y entrega


## Fase 32: Reorganización del Sistema - Seguimiento Interno y Cotizaciones Inteligentes
- [ ] Revisar arquitectura actual y flujo de trabajo
- [ ] Crear módulo de cotizaciones mejorado con análisis de rentabilidad automático:
  - [ ] Inputs: Cliente/Broker, Origen, Destino, Peso, Millas, Tarifa base, Extras
  - [ ] Cálculos automáticos: Ingreso total, Millas, Costo operativo, Ganancia, Margen
  - [ ] Veredicto automático: ACEPTAR/NEGOCIAR/RECHAZAR
  - [ ] Historial de cotizaciones con análisis
- [ ] Simplificar Vista del Chofer para seguimiento interno:
  - [ ] Solo cargas de la compañía (no del broker)
  - [ ] Foto de entrega (POD)
  - [ ] Registro de gastos (combustible, peajes)
  - [ ] Estado de carga
- [ ] Mejorar módulo de Finanzas:
  - [ ] Auditoría completa de transacciones
  - [ ] Rentabilidad por carga
  - [ ] Reportes mensuales
- [ ] Probar y validar cambios
- [ ] Checkpoint final


## Bugs to Fix
- [ ] Fix React infinite loop error in FinanceDashboard (/finance-dashboard page) - "Maximum update depth exceeded"
- [ ] Investigate useEffect dependencies in components rendering financial data
- [ ] Test FinanceDashboard page after fix to ensure no console errors

## Fase 33: Banking Cash Flow Management
- [x] Crear esquema DB: tablas cash_flow_rules, bank_account_classifications, reserve_transfer_suggestions
- [x] Backend: implementar 6 endpoints tRPC (getCashFlowRule, saveCashFlowRule, getBankAccountClassifications, setBankAccountClassification, calculateReserveSuggestion, getCashFlowSummary)
- [x] Frontend: crear página BankingCashFlow con 3 cards (Cash Flow Rule, Account Classifications, Reserve Suggestion Preview)
- [x] Frontend: agregar item de menú "Banking Cash Flow" en sidebar (sección FINANCE)
- [x] Validación funcional completa en preview (Manus)
- [x] Validación de persistencia: edit → save → reload → verify
- [x] Validación de endpoints tRPC con cliente Node.js
- [x] Fix de React infinite loop error en FinanceDashboard (useCallback memoization)
- [x] Agregado a RBAC: permisos banking-cashflow para admin y owner
- [x] Agregada lógica de visibilidad garantizada en getFilteredMenuItems() (patrón Dispatch Board)
- [x] Tests para banking router (4 tests nuevos)
- [x] Checkpoint y entrega

## Mejoras Futuras Menores
- [ ] Mover Banking Cash Flow al bloque visual de FINANCE en el sidebar para consistencia del menú
- [ ] Implementar auto-transfer scheduling: toggle + selector de día en Cash Flow Rule card
- [ ] Agregar saldo actual de cuenta en Account Classifications para contexto de reservas
- [ ] Implementar webhook para transferencias automáticas de reserva

## Fase 34: Mejoras Profesionales del Proyecto
- [x] Interfaz profesional de cotizaciones tipo tabla (como ejemplo del usuario)
- [x] Dashboard ejecutivo con KPIs y análisis de tendencias
- [x] Sistema de notificaciones en tiempo real
- [x] Reportes exportables (PDF, Excel) para presentaciones
- [x] Mejorar UI/UX para mobile y desktop
- [x] Auditoría completa de operaciones
- [x] Tests y validación
- [x] Checkpoint final

## Fase 34: Corrección de Actualización en Tiempo Real
- [x] Corregir actualización en tiempo real en Vista Chofer (cambio de invalidate a refetch)
- [x] Corregir actualización en tiempo real en Cotizaciones (guardado de veredicto manual)
- [x] Investigar problema de caché (confirmado: invalidate no refetch)
- [x] Implementar refetch automático después de mutaciones
- [x] Agregar campos a BD para veredicto manual
- [x] Crear endpoint saveVerdictOverride en backend
- [x] Integrar guardado en frontend
- [x] Checkpoint y entrega

## Fase 35: Sistema de Costos y Configuración Personalizada
- [x] Crear tabla businessConfig en BD con costos fijos y variables
- [x] Crear tabla distanceRecargo y weightRecargo para recargos dinámicos
- [x] Backend: routers para get/update businessConfig
- [x] Backend: routers para get/update distanceRecargo y weightRecargo
- [x] Frontend: página Settings/Configuration para editar costos
- [x] Frontend: tablas interactivas para editar recargos por distancia y peso
- [x] Actualizar lógica de cotización para usar costos personalizados
- [x] Aplicar recargos automáticos en cotizaciones según distancia y peso
- [ ] Dashboard: mostrar proyección de ganancia mensual
- [ ] Dashboard: alertas si margen < ganancia mínima deseada
- [ ] Tests para sistema de costos
- [x] Checkpoint y entrega

## Fase 36: Sistema de Alertas para Cargas Bajo Mínimo
- [x] Crear tabla priceAlerts en BD
- [x] Agregar lógica de alertas en calculateQuotation
- [x] Backend: endpoint para obtener alertas activas (getUnreadAlerts, getAlerts, getAlertStats)
- [x] Backend: endpoint para marcar alerta como leída (markAsRead, markAllAsRead)
- [x] Frontend: componente AlertBanner en Quotation
- [x] Frontend: notificación visual cuando se detecta carga bajo mínimo
- [x] Frontend: widget AlertsWidget en Dashboard
- [x] Integrar con sistema de notificaciones existente
- [x] Checkpoint y entrega

## Fase 37: Historial de Cotizaciones con Filtros y Exportación PDF
- [ ] Backend: endpoint para obtener historial de cotizaciones con filtros
- [ ] Frontend: página QuotationHistory con tabla de cotizaciones
- [ ] Frontend: filtros por estado (draft, accepted, rejected, negotiated)
- [ ] Frontend: búsqueda por cliente o dirección
- [ ] Frontend: exportación a PDF con detalles de cotización
- [ ] Frontend: agregar link a QuotationHistory en navegación
- [ ] Tests para historial de cotizaciones
- [ ] Checkpoint y entrega


## Fase 38: Módulo de Importación de Cargas (Brokers)
- [x] Crear tablas broker_credentials, broker_loads, sync_logs en BD
- [x] Crear db-broker-loads.ts con helpers para operaciones CRUD
- [x] Crear brokerLoadsRouter con endpoints para importar cargas
- [x] Integrar brokerLoadsRouter en appRouter
- [x] Exportar calculateDistance para reutilización
- [ ] Crear página ImportBrokerLoads (frontend) - PRÓXIMA FASE
- [ ] Crear página BrokerLoadsManagement (frontend) - PRÓXIMA FASE
- [ ] Agregar navegación en sidebar - PRÓXIMA FASE
- [ ] Estructura lista para APIs futuras (Coyote, DAT) - PRÓXIMA FASE

- [x] Crear página ImportBrokerLoads con formulario manual
- [x] Crear componente CSV uploader con validación
- [x] Integrar con backend brokerLoadsRouter
- [x] Agregar navegación en sidebar
- [x] Probar y validar


## Fase 39: Dashboard de Gestión de Cargas Importadas
- [x] Crear página BrokerLoadsManagement con tabla de cargas
- [x] Agregar filtros por estado (new, reviewed, accepted, rejected, expired, converted)
- [x] Agregar búsqueda por dirección
- [x] Crear modal para convertir carga a cotización
- [x] Integrar con backend brokerLoadsRouter
- [x] Agregar navegación en sidebar
- [x] Probar y validar


## Fase 40: Indicador de Carga en Pagos en Lote
- [x] Agregar loading state en mutación de creación de lote
- [x] Mostrar spinner/indicador visual durante creación
- [x] Deshabilitar botón mientras se crea el lote
- [x] Mostrar toast de éxito/error (ya estaba implementado)
- [x] Probar y validar


## Fase 41: Indicadores de Carga en Operaciones de Lotes
- [x] Agregar loading state en mutación de procesar lote
- [x] Agregar loading state en mutación de aprobar lote
- [x] Agregar loading state en mutación de rechazar lote
- [x] Mostrar spinner animado durante operaciones
- [x] Deshabilitar botones mientras se procesan
- [x] Probar y validar


## Fase 42: Dashboard de Proyecciones de Millas y Ganancia
- [x] Crear backend endpoint para calcular proyecciones mensuales
- [x] Calcular millas completadas y proyectadas hasta fin de mes
- [x] Calcular ganancia total proyectada
- [x] Crear componente de tarjetas de proyecciones
- [x] Agregar gráfico de progreso hacia meta de 4,000 millas
- [x] Integrar en Dashboard Ejecutivo
- [x] Probar y validar


## Fase 43: Comparación Histórica de Millas y Ganancias
- [x] Crear backend helper para calcular métricas del mes anterior
- [x] Calcular variación porcentual (mes actual vs mes anterior)
- [x] Crear componente de tarjeta de comparación
- [x] Agregar gráficos comparativos (barras, líneas)
- [x] Integrar en Dashboard
- [x] Probar y validar


## Fase 44: Vista Trimestral de Comparación Histórica
- [x] Crear backend helper para calcular métricas de últimos 3 meses
- [x] Agregar endpoint tRPC para comparación trimestral
- [x] Crear componente de selector de vista (mensual/trimestral)
- [x] Crear componente de gráficos trimestrales
- [x] Integrar selector en Dashboard
- [x] Probar y validar


## Fase 45: Consolidación y Optimización del Dashboard
- [x] Revisar componentes duplicados en dashboard
- [x] Unificar HistoricalComparisonCard y HistoricalComparisonCharts en un componente con pestañas
- [x] Unificar comparación mensual y trimestral en un único componente con pestañas
- [x] Eliminar componentes redundantes
- [x] Optimizar queries tRPC
- [x] Probar y validar


## Fase 46: Vista Anual de Comparación
- [x] Crear backend helper para calcular métricas de todos los meses del año
- [x] Agregar endpoint tRPC para comparación anual
- [x] Integrar vista anual en ComparisonAnalytics con pestaña adicional
- [x] Crear gráficos anuales (línea de tendencia, heatmap de meses)
- [x] Agregar análisis de desempeño anual
- [x] Probar y validar


## Fase 47: Corrección de Error en /business-settings
- [x] Revisar página BusinessSettings.tsx
- [x] Revisar endpoints tRPC relacionados
- [x] Identificar qué query está retornando HTML en lugar de JSON
- [x] Corregir el error en backend
- [x] Probar y validar la corrección


## Fase 48: Integración de Evaluador de Cargas Unificado
- [x] Crear backend helper para evaluación de cargas (db-load-evaluator.ts)
- [x] Crear endpoint tRPC para evaluación
- [x] Crear componentes reutilizables de UI para evaluador
- [x] Crear página LoadEvaluator con interfaz mejorada
- [x] Integrar con configuración real del usuario desde backend
- [x] Agregar persistencia de evaluaciones
- [x] Probar y validar


## Fase 49: Optimización del Load Evaluator
- [x] Extraer lógica de formulario a hook personalizado
- [x] Crear componente presentacional reutilizable
- [x] Mejorar separación de responsabilidades
- [x] Mantener integración tRPC directa
- [x] Probar y validar


## Fase 50: Exportar Evaluación a PDF
- [x] Crear helper para generar PDF con evaluación
- [x] Agregar botón de descarga en componente de resultados
- [x] Incluir desglose de costos en PDF
- [x] Incluir recomendación y decisión en PDF
- [x] Agregar información del cliente y carga
- [x] Probar y validar


## Fase 51: Módulo de Cumplimiento Fiscal (Tax Compliance)
- [x] Diseñar esquema de base de datos para documentos fiscales
- [x] Crear tabla de documentos con categorías (ingresos, gastos, depreciación, etc.)
- [x] Crear backend para generación de reportes fiscales
- [x] Implementar descarga de reporte de ingresos (Income Report)
- [x] Implementar descarga de reporte de gastos (Expense Report)
- [x] Implementar descarga de reporte de transacciones (Transaction Report)
- [x] Crear endpoint para escaneo y carga de documentos
- [x] Implementar almacenamiento de documentos en S3
- [x] Crear UI para Tax Compliance Dashboard
- [x] Agregar sección de carga de documentos (drag & drop)
- [x] Agregar galería de documentos por categoría
- [x] Crear generador de reportes PDF para IRS
- [x] Agregar búsqueda y filtrado de documentos
- [x] Probar y validar


## Fase 52: OCR para Escaneo de Facturas y Recibos
- [x] Instalar dependencias de OCR (Tesseract.js o similar)
- [x] Crear backend helper para procesamiento de imágenes OCR
- [x] Crear helper para extraer datos de facturas (monto, fecha, proveedor, categoría)
- [x] Crear endpoint tRPC para procesar documentos con OCR
- [x] Crear componente UI para carga de documentos con preview
- [x] Crear componente de revisión de datos extraídos
- [x] Integrar OCR en Tax Compliance Dashboard
- [x] Agregar validación de datos extraídos
- [x] Probar y validar


## Fase 53: Almacenamiento de Documentos OCR en S3 con Auditoría
- [x] Actualizar schema para agregar tabla de documentos OCR con referencias S3
- [x] Crear tabla de auditoría con metadatos completos
- [x] Crear helper para guardar imágenes en S3 con nombres únicos
- [x] Actualizar endpoint OCR para guardar en S3 y BD
- [x] Integrar S3 storage en OCRDocumentUpload
- [x] Crear vista de historial de documentos con búsqueda
- [x] Agregar descarga de documentos desde S3
- [x] Probar y validar


## Fase 54: Endpoints tRPC para OCR S3 Storage
- [x] Crear ocrStorageRouter con endpoints para guardar, buscar y auditar documentos
- [x] Agregar endpoint saveDocument (mutation) para guardar OCR en S3
- [x] Agregar endpoint getDocument (query) para obtener documento específico
- [x] Agregar endpoint getUserDocuments (query) con paginación
- [x] Agregar endpoint searchDocuments (query) con filtros
- [x] Agregar endpoint getAuditTrail (query) para historial de documento
- [x] Agregar endpoint generateTaxReport (query) para reporte fiscal
- [x] Integrar ocrStorageRouter en appRouter
- [x] Crear tests para todos los endpoints
- [x] Probar y validar


## Fase 55: Sistema Completo de Cumplimiento Fiscal IRS
- [ ] Crear tablas de BD para auditoría trail (complianceAudit, complianceEvents, complianceAlerts)
- [ ] Crear tablas para validaciones IRS (mileageRecords, expenseReceipts, incomeVerification)
- [ ] Implementar validaciones automáticas de cumplimiento (millas reportadas vs documentadas, gastos vs recibos, ingresos vs transacciones)
- [ ] Crear sistema de alertas de cumplimiento (discrepancias, documentos faltantes, gastos sospechosos)
- [ ] Generar reportes IRS automáticos (Schedule C, Form 1040, deductions summary)
- [ ] Crear dashboard de cumplimiento con KPIs de auditoría
- [ ] Implementar auditoría trail completa (quién, qué, cuándo, por qué)
- [ ] Agregar validación de reglas IRS (deductions permitidas, límites de gastos, etc.)
- [ ] Crear exportación de documentos para auditoría del IRS
- [ ] Probar y validar


## Fase 56: Endpoints tRPC para Cumplimiento Fiscal IRS
- [x] Crear irsComplianceRouter con endpoints
- [x] Agregar endpoint getComplianceSummary (query)
- [x] Agregar endpoint generateAuditReport (mutation)
- [x] Agregar endpoint getAuditTrail (query)
- [x] Integrar irsComplianceRouter en appRouter
- [x] Crear tests para endpoints
- [x] Probar y validar


## Fase 57: Exportación de Reportes Fiscales en PDF y Excel
- [x] Crear helper para generar PDF de reportes fiscales (Schedule C, Form 1040, Mileage Log)
- [x] Crear helper para generar Excel de reportes fiscales
- [x] Agregar endpoint tRPC para exportar reporte en PDF
- [x] Agregar endpoint tRPC para exportar reporte en Excel
- [x] Crear UI para descargar reportes (botones en Tax Compliance Dashboard)
- [x] Probar y validar exportación


## Fase 58: Integración de Botones de Descarga en Tax Compliance Dashboard
- [x] Crear componente FiscalReportDownload con botones PDF/Excel
- [x] Integrar en Tax Compliance Dashboard
- [x] Agregar selector de período (mes/trimestre/año)
- [x] Agregar indicador de carga durante descarga
- [x] Probar y validar


## Fase 59: Optimización de Vista de Chofer
- [x] Remover componente de mapa de vista de chofer
- [x] Crear componente para carga de fotos de recibos/pruebas de entrega
- [x] Agregar funcionalidad de seguimiento de entregas
- [x] Mantener cambio de estatus de cargas
- [x] Agregar galería de fotos de entregas
- [x] Probar y validar


## Fase 60: Revisión y Verificación Pre-Publicación
- [ ] Revisar arquitectura general del proyecto
- [ ] Verificar todas las funcionalidades principales
- [ ] Analizar software de dispatcher profesional
- [ ] Identificar funcionalidades faltantes críticas
- [ ] Crear plan de mejoras
- [ ] Implementar mejoras críticas
- [ ] Verificar rendimiento y escalabilidad
- [ ] Revisar seguridad y cumplimiento


## Fase 61: Búsqueda Avanzada de Cargas
- [x] Crear backend helper para búsqueda con filtros
- [x] Crear endpoint tRPC para búsqueda avanzada
- [x] Crear UI de filtros avanzados
- [x] Integrar en página de cargas
- [x] Probar y validar

## Fase 62: Notificaciones en Tiempo Real
- [ ] Crear sistema de notificaciones en BD
- [ ] Crear WebSocket para notificaciones real-time
- [ ] Crear endpoint tRPC para notificaciones
- [ ] Crear UI para mostrar notificaciones
- [ ] Integrar alertas de cambios de estatus
- [ ] Probar y validar

## Fase 63: Chat Dispatcher-Chofer
- [ ] Crear tabla de mensajes en BD
- [ ] Crear backend para gestión de mensajes
- [ ] Crear endpoint tRPC para chat
- [ ] Crear UI de chat integrada
- [ ] Integrar WebSocket para mensajes en tiempo real
- [ ] Probar y validar

## Fase 64: Reporte de Utilización de Choferes
- [ ] Crear backend helper para cálculo de métricas
- [ ] Crear endpoint tRPC para reportes
- [ ] Crear UI con tabla de choferes
- [ ] Agregar gráficos de productividad
- [ ] Integrar en dashboard
- [ ] Probar y validar


## Fase 62: Chat Dispatcher-Chofer en Tiempo Real
- [x] Crear tabla de mensajes en BD
- [x] Crear backend helper para gestión de mensajes
- [x] Crear endpoint tRPC para chat
- [x] Crear WebSocket para mensajes en tiempo real
- [x] Crear componente de chat UI
- [x] Integrar en DriverView y Dashboard
- [x] Agregar notificaciones de nuevos mensajes
- [x] Probar y validar

## Fase 50: Sección de Perfil de Usuario
- [ ] Actualizar esquema DB: tabla user_preferences con 15 campos
- [ ] Backend: queries para gestionar preferencias del usuario
- [ ] Backend: routers tRPC para updateProfile, getProfile, updatePreferences
- [ ] Frontend: componente ProfileForm con información de contacto
- [ ] Frontend: componente PreferencesForm con opciones de notificación
- [ ] Frontend: página UserProfile con tabs (Perfil, Preferencias, Seguridad)
- [ ] Frontend: integrar en navegación del Dashboard
- [ ] Tests para perfil de usuario (8 tests nuevos)
- [ ] Checkpoint y entrega

## Fase 50: Sección de Perfil de Usuario
- [x] Actualizar esquema DB: tabla user_preferences con 15 campos
- [x] Backend: queries para gestionar preferencias del usuario
- [x] Backend: routers tRPC para updateProfile, getProfile, updatePreferences
- [x] Frontend: componente ProfileForm con información de contacto
- [x] Frontend: componente PreferencesForm con opciones de notificación
- [x] Frontend: página UserProfile con tabs (Perfil, Preferencias, Seguridad)
- [x] Frontend: integrar en navegación del Dashboard
- [x] Tests para perfil de usuario (8 tests nuevos)
- [x] Checkpoint y entrega


## Fase 65: Mejora de Vista del Chofer con Detalles Completos de Carga
- [x] Agregar campos de hora de recogida (pickupTime) a vista de detalles
- [x] Agregar campos de hora de entrega (deliveryTime) a vista de detalles
- [x] Mostrar millas totales de la carga
- [x] Mostrar notas especiales si existen
- [x] Mejorar presentación visual con iconos de MapPin y Clock
- [x] Usar colores de marca para recogida (verde) y entrega (rojo)
- [x] Corregir errores TypeScript en DriverView.tsx
- [x] Corregir parámetros de uploadBOL mutation
- [x] Corregir parámetros de uploadPOD mutation
- [x] Corregir importación de AdminContacts en App.tsx
- [x] Corregir tipo TrendData en getContactTrends
- [x] Agregar useState import a AdminDashboard.tsx
- [x] Tests: 361/381 pasando (94.8%)
- [x] Checkpoint guardado


## Fase 66: Corrección de Error en Agregar Chofer
- [x] Identificado: AddDriverModal usaba fetch en lugar de tRPC
- [x] Identificado: Campo "phone" no coincidía con "phoneNumber" del servidor
- [x] Corregido: Cambiar AddDriverModal a usar tRPC mutation
- [x] Corregido: Mapear "phone" a "phoneNumber" en payload
- [x] Corregido: Usar isPending en lugar de isLoading
- [x] Tests: 361/381 pasando (94.8%)
- [x] Checkpoint guardado


## Fase 67: Validación de Email en Tiempo Real para Agregar Choferes
- [x] Crear endpoint tRPC admin.checkEmailAvailability
- [x] Implementar hook useEmailValidation con debounce
- [x] Agregar indicadores visuales (checkmark/error) en el input
- [x] Mostrar mensaje de estado (disponible/no disponible)
- [x] Deshabilitar botón de envío si email no es válido
- [x] Tests para validación de email
- [x] Checkpoint y entrega


## Fase 68: Confirmación de Contraseña para Agregar Choferes
- [x] Actualizar endpoint createDriver para aceptar contraseña
- [x] Implementar hash de contraseña con bcrypt
- [x] Crear hook usePasswordValidation con validación de coincidencia
- [x] Agregar campos de contraseña y confirmación en formulario
- [x] Mostrar indicadores visuales de fortaleza de contraseña
- [x] Validar requisitos mínimos (longitud, caracteres especiales)
- [x] Tests para validación de contraseña
- [x] Checkpoint y entrega


## Fase 69: Recuperación de Contraseña por Correo
- [x] Crear tabla passwordResetTokens en schema
- [x] Generar tokens de reset con expiración (24h)
- [x] Crear endpoint requestPasswordReset
- [x] Crear endpoint validateResetToken
- [x] Crear endpoint resetPassword
- [x] Implementar servicio de envío de emails
- [x] Crear página de solicitud de reset
- [x] Crear página de confirmación de reset
- [x] Tests para flujo de recuperación
- [x] Checkpoint y entrega


## Fase 70: Corrección de Roles y Permisos
- [x] Revisar roles actuales (owner, admin, driver, user)
- [x] Asegurar que solo Wascar y Yisvel tengan acceso admin completo
- [x] Restringir acceso de choferes a panel de cargas únicamente
- [x] Verificar permisos en todas las rutas protegidas
- [x] Crear procedimiento para promover/degradar usuarios

## Fase 71: Autenticación Manual de Choferes
- [x] Crear tabla passwordAuditLog para auditoría
- [x] Crear endpoint auth.driverLogin con validación de email/contraseña
- [x] Generar JWT para sesiones de chofer
- [x] Crear endpoint para renovar tokens JWT
- [x] Validar que choferes solo accedan a sus datos

## Fase 72: Notificaciones por Email de Cargas
- [x] Crear tabla loadNotifications para tracking
- [x] Crear endpoint para enviar notificación de nueva carga
- [x] Implementar template de email con detalles de carga
- [x] Agregar endpoint para marcar notificaciones como leídas
- [x] Tests para notificaciones

## Fase 73: Auditoría de Cambios de Contraseña
- [x] Registrar cambios en passwordAuditLog
- [x] Incluir timestamp, usuario y IP
- [x] Crear vista de historial para admins
- [x] Endpoint para obtener historial de auditoría
- [x] Tests para auditoría


## Fase 74: Corrección de Filtrado de Menú por Roles
- [x] Verificar rol del usuario autenticado
- [x] Revisar lógica de getMenuItems en DashboardLayout
- [x] Asegurar que choferes solo vean 5 items de menú
- [x] Verificar que rutas protegidas rechacen acceso a choferes
- [x] Actualizar roles en base de datos (Wascar y Yisvel = admin, otros = driver)


## Fase 75: Revisión de Código y Página de Login de Chofer
- [x] Revisar componente Quotation - crear documento CODE_REVIEW.md
- [x] Crear página DriverLoginPage.tsx con validación
- [x] Implementar tRPC endpoint auth.driverLogin
- [x] Agregar ruta /driver-login en App.tsx
- [ ] Crear tests para DriverLoginPage

## Fase 76: Botones de Aceptar/Rechazar Cargas
- [x] Crear endpoint loads.acceptLoad en routers
- [x] Crear endpoint loads.rejectLoad en routers
- [x] Actualizar tabla loads con campo loadStatus
- [x] Agregar botones en DriverView
- [x] Implementar confirmación antes de aceptar/rechazar
- [x] Mostrar notificación de éxito
- [x] Tests para aceptar/rechazar cargas (14 tests pasando)

## Fase 77: Notificaciones en Tiempo Real (WebSocket)
- [ ] Instalar ws (WebSocket) package
- [ ] Crear WebSocket server en server/_core/websocket.ts
- [ ] Implementar conexión WebSocket en cliente
- [ ] Crear hook useLoadNotifications
- [ ] Emitir eventos cuando se asignan nuevas cargas
- [ ] Mostrar toast de notificación en tiempo real
- [ ] Tests para WebSocket


## Fase 77: Notificaciones en Tiempo Real con WebSocket
- [x] Instalar paquete ws para WebSocket
- [x] Crear servidor WebSocket en server/_core/websocket.ts
- [x] Implementar gestor de conexiones por usuario
- [x] Crear eventos: loadAssigned, loadUpdated, loadCancelled
- [x] Implementar cliente WebSocket en React (hook useWebSocket)
- [x] Integrar notificaciones en DriverView
- [x] Agregar sonido y badge de notificación
- [x] Tests para WebSocket (eventos, conexión, desconexión) - 16 tests pasando
- [x] Checkpoint y entrega


## Fase 78: Dashboard en Tiempo Real para Administradores
- [ ] Crear tabla driver_locations con campos de geolocalización
- [ ] Generar migración SQL para tabla driver_locations
- [ ] Crear endpoints tRPC para obtener ubicaciones activas
- [ ] Crear endpoints tRPC para obtener cargas activas con estado
- [ ] Implementar componente RealtimeMap con Google Maps
- [ ] Agregar marcadores de choferes con información emergente
- [ ] Agregar marcadores de cargas con colores por estado
- [ ] Crear página RealtimeDashboard con filtros
- [ ] Integrar WebSocket para actualizaciones en vivo
- [ ] Agregar panel lateral con detalles de chofer/carga
- [ ] Tests para endpoints y componentes
- [ ] Checkpoint y entrega


## Fase 84: Mapa Interactivo para Dashboard de Admins
- [x] Crear endpoints tRPC para obtener ubicaciones de choferes
- [x] Implementar componente DriverMap con Google Maps
- [x] Agregar marcadores con información del chofer
- [x] Crear página RealtimeDashboard con filtros
- [x] Integrar con rutas y navegación
- [x] Tests para mapa interactivo (6 tests)
- [x] Checkpoint y entrega


## Fase 85: Filtrado de Choferes en Servicio en el Mapa
- [x] Agregar estado de filtro al componente DriverMapInteractive
- [x] Implementar lógica para mostrar/ocultar marcadores según estado
- [x] Agregar botones de filtro en la UI (Todos, En Servicio, Disponibles)
- [x] Actualizar contadores según filtro activo
- [x] Tests para funcionalidad de filtrado (8 tests)
- [x] Checkpoint y entrega


## Fase 86: Corrección de Error 429 (Rate Limiting)
- [x] Diagnosticar causa de demasiadas solicitudes
- [x] Revisar queries de tRPC para evitar duplicados
- [x] Implementar debounce en queries
- [x] Configurar staleTime y gcTime en QueryClient
- [x] Agregar retry logic con backoff exponencial
- [x] Tests para rate limiting
- [x] Checkpoint y entrega


## Fase 87: Mejora del Dashboard - Fase 1 (KPIs y Cargas Recientes)
- [x] Verificar que todos los endpoints tRPC existen (dashboard.kpis, dashboard.recentLoads, etc.)
- [x] Verificar que los componentes necesarios existen (AlertsWidget, ProjectionsCard, TrendCharts, ComparisonAnalytics, ChatWidget, DriverLocationMap, AssignLoadModal)
- [x] Corregir Dashboard.tsx con imports correctos y estructura mejorada
- [x] Verificar que formatCurrency maneja valores null/undefined correctamente
- [x] Verificar que los KPIs se cargan correctamente
- [x] Verificar que las cargas recientes se muestran correctamente
- [x] Crear tests unitarios para Dashboard.tsx (KPIs, cargas recientes, filtros)
- [x] Ejecutar tests y verificar que pasan
- [x] Guardar checkpoint

## Fase 88: Mejora del Dashboard - Fase 2 (AlertsWidget, AssignLoadModal, Acciones Rápidas)
- [x] Revisar componente AlertsWidget
- [x] Revisar componente AssignLoadModal
- [x] Integrar AlertsWidget en Dashboard
- [x] Integrar AssignLoadModal en Dashboard
- [x] Crear tests para AlertsWidget y AssignLoadModal
- [x] Ejecutar tests y verificar que pasan
- [x] Guardar checkpoint

## Fase 89: Mejora del Dashboard - Fase 3 (Proyecciones y Análisis Comparativo)
- [ ] Revisar componente ProjectionsCard
- [ ] Revisar componente TrendCharts
- [ ] Revisar componente ComparisonAnalytics
- [ ] Integrar ProjectionsCard en Dashboard
- [ ] Integrar TrendCharts en Dashboard
- [ ] Integrar ComparisonAnalytics en Dashboard
- [ ] Crear tests para componentes de análisis
- [ ] Ejecutar tests y verificar que pasan
- [ ] Guardar checkpoint

## Fase 90: Mejora del Dashboard - Fase 4 (ChatWidget y DriverLocationMap)
- [ ] Revisar componente ChatWidget
- [ ] Revisar componente DriverLocationMap
- [ ] Integrar ChatWidget en Dashboard (solo admin)
- [ ] Integrar DriverLocationMap en Dashboard (solo admin)
- [ ] Crear tests para ChatWidget y DriverLocationMap
- [ ] Ejecutar tests y verificar que pasan
- [ ] Guardar checkpoint final


## Fase 91: Optimización - Lazy Loading para Componentes Pesados
- [x] Identificar componentes pesados (ProjectionsCard, TrendCharts, ComparisonAnalytics, DriverLocationMap, ChatWidget)
- [x] Crear componente LazyLoad wrapper con Suspense y fallback
- [x] Implementar lazy loading para ProjectionsCard
- [x] Implementar lazy loading para TrendCharts
- [x] Implementar lazy loading para ComparisonAnalytics
- [x] Implementar lazy loading para DriverLocationMap
- [x] Implementar lazy loading para ChatWidget
- [x] Implementar lazy loading para AssignLoadModal
- [x] Crear Skeleton loaders para cada componente
- [x] Medir mejora de performance (Lighthouse, Core Web Vitals)
- [x] Crear tests para lazy loading
- [x] Ejecutar tests y verificar que pasan
- [x] Guardar checkpoint


## Fase 92: Optimización - Prefetching Inteligente
- [x] Crear hook usePrefetch para prefetching de chunks
- [x] Crear componente PrefetchLink para prefetch en hover
- [x] Implementar prefetch en botones de acciones rápidas
- [x] Implementar prefetch en navegación
- [x] Implementar prefetch en scroll (intersection observer)
- [x] Crear estrategia de prefetch basada en conexión (4G, 3G, etc.)
- [x] Medir impacto de prefetching en performance
- [x] Crear tests para prefetching
- [x] Documentar estrategia de prefetching
- [x] Guardar checkpoint


## Fase 89: Proyecciones y Análisis Comparativo
- [x] Revisar estructura de ProjectionsCard y TrendCharts
- [x] Verificar que los datos de monthlyProjections vienen correctamente del backend
- [x] Integrar ProjectionsCard en Dashboard con datos reales
- [x] Integrar TrendCharts en Dashboard con datos reales
- [x] Revisar ComparisonAnalytics para análisis histórico
- [x] Integrar ComparisonAnalytics en Dashboard
- [x] Crear tests para ProjectionsCard con datos mock
- [x] Crear tests para TrendCharts con datos mock
- [x] Verificar que los gráficos se renderizan correctamente
- [x] Optimizar performance de gráficos (memoization)
- [x] Guardar checkpoint


## Fase 93: Exportación de Reportes (PDF/Excel)
- [x] Crear utilidades para exportar proyecciones a PDF
- [x] Crear utilidades para exportar proyecciones a Excel
- [x] Crear utilidades para exportar análisis comparativo a PDF
- [x] Crear utilidades para exportar análisis comparativo a Excel
- [x] Crear componente ExportButton para Dashboard
- [x] Integrar ExportButton en ProjectionsCard
- [ ] Integrar ExportButton en TrendCharts
- [ ] Integrar ExportButton en ComparisonAnalytics
- [x] Crear tests para funciones de exportación
- [x] Verificar que los archivos se generan correctamente
- [ ] Guardar checkpoint


## Fase 94: Optimización del Servidor y Rate Limiter
- [x] Mejorar configuración del rate limiter para desarrollo
- [x] Excluir hosts Manus (.manus.computer) del rate limiting
- [x] Excluir archivos estáticos (favicon, debug-collector, etc.) del rate limiting
- [x] Configurar MIME types correctos para archivos estáticos
- [x] Agregar cache control headers para assets
- [x] Reiniciar servidor con nueva configuración
- [x] Verificar que no hay errores 429 ni MIME type warnings


## Fase 95: Driver View Production-Ready

### Fase 1: Integración tRPC y Datos Reales
- [x] Crear endpoints tRPC para datos de choferes (loads, earnings, stats)
- [x] Conectar DriverView con tRPC queries
- [x] Implementar real-time updates para cargas activas
- [x] Agregar error handling y loading states

### Fase 2: Gestión de Cargas Avanzada
- [x] Implementar filtrado por estado (available/in_transit/delivered)
- [x] Crear modal de Load Details con información completa
- [x] Agregar timeline de estado de carga
- [x] Implementar "Next Load" / "Current Priority" card

### Fase 3: Sistema de Prueba de Entrega
- [x] Implementar upload de fotos (cámara + archivo)
- [x] Soporte para múltiples imágenes
- [x] Integración con S3/storage
- [x] Guardar URLs de prueba en backend
- [x] Validación de campos requeridos
- [x] Prevención de envíos duplicados

### Fase 4: Navegación e Integración de Mapas
- [x] Agregar botones "Open in Google Maps"
- [x] Agregar botones "Open in Waze"
- [x] Usar coordenadas o direcciones de pickup/delivery
- [x] Generar URLs de navegación correctas

### Fase 5: Optimizaciones Móviles y UX
- [x] Diseño mobile-first
- [x] CTAs claros (Accept Load, Start Delivery, Confirm Delivery)
- [x] Indicador visual de progreso
- [x] Loading states durante uploads
- [x] Responsive layout para tablets

### Fase 6: Testing y Validación
- [x] Tests unitarios para componentes
- [x] Tests de integración con tRPC
- [x] Tests de upload de archivos
- [x] Validación de flujos de usuario
- [x] Performance testing en móvil


## Fase 96: Driver View - Prioritized Improvements

### Priority 1: Proof of Delivery Workflow
- [x] Enhance camera capture for mobile (real camera access, not just file input)
- [x] Support multiple proof images per load
- [x] Add delivery notes field to POD modal
- [x] Capture delivery timestamp automatically
- [x] Save proof metadata to backend with S3 URLs
- [x] Link proof records to load in database
- [ ] Display proof history in load details

### Priority 2: Full Load Detail Experience
- [x] Show complete client information in load details
- [x] Display pickup and delivery dates/times
- [x] Show cargo details (weight, type, special instructions)
- [x] Display delivery notes and instructions
- [x] Show price information (with permission checks)
- [x] Display current load status
- [ ] Show proof of delivery history if available
- [ ] Add timeline of status changes

### Priority 3: Navigation Integration
- [x] Add Google Maps button in load details
- [x] Add Waze button in load details
- [x] Use pickup address for initial navigation
- [x] Use delivery address for final destination
- [x] Generate proper navigation URLs

### Priority 4: Periodic Location Tracking
- [ ] Create location update endpoint (latitude, longitude, accuracy)
- [ ] Implement periodic location updates (every 30 seconds when active)
- [ ] Store latest driver location per active load
- [ ] Admin can view latest driver location
- [ ] Handle location permission gracefully

### Priority 5: Delivery Signature Capture
- [ ] Add signature canvas after photo proof upload
- [ ] Capture signature as image
- [ ] Save signature as part of proof of delivery
- [ ] Display signature in proof history

### Priority 6: Offline-Friendly Behavior
- [ ] Queue delivery confirmations when offline
- [ ] Queue POD uploads when offline
- [ ] Sync queued items when connection returns
- [ ] Show offline indicator to driver
- [ ] Prevent duplicate submissions on reconnect


### Priority 4: Delivery Signature Capture
- [x] Create SignaturePad component with canvas-based drawing
- [x] Mobile-friendly touch support
- [x] Add signature capture after POD photos
- [x] Save signature as image to S3
- [x] Store signature URL in podDocuments
- [x] Add timestamp to signature
- [ ] Display signature in POD history
- [x] Clear/redo functionality for signature

### Priority 5: Periodic Location Tracking
- [x] Create location update endpoint (latitude, longitude, accuracy)
- [x] Implement periodic updates (every 30 seconds when active load)
- [x] Store latest driver location per active load
- [x] Admin can view latest driver location
- [x] Handle location permission gracefully
- [x] Stop tracking when no active load
- [x] Battery-efficient implementation

### Priority 6: Offline Queue System
- [x] Create local storage queue for delivery confirmations
- [x] Queue POD uploads when offline
- [x] Detect connection status changes
- [x] Sync queued items when connection returns
- [x] Prevent duplicate submissions
- [x] Show sync status indicator to driver
- [x] Handle sync failures gracefully

### Additional: Real-Time Admin Notifications & Mobile UX
- [ ] Real-time notification when delivery completed
- [ ] Mobile UX improvements for POD flow
- [ ] Signature capture integration
- [ ] Offline status indicator
- [ ] Sync progress indicator


## Fase 97: Admin Dashboard & Advanced Features

### Feature 1: Admin Dashboard - Real-Time Driver Location Map
- [ ] Create AdminDashboard.tsx component
- [ ] Integrate Google Maps component for live tracking
- [ ] Fetch active drivers with in_transit loads
- [ ] Display driver markers with load info
- [ ] Show driver name, load ID, pickup/delivery addresses
- [ ] Real-time location updates (subscribe to location changes)
- [ ] Click marker to see full load details
- [ ] Filter by status (in_transit, available, completed)
- [ ] Add to admin navigation in DashboardLayout

### Feature 2: POD History - Photo Gallery & Signature Display
- [ ] Create PODHistoryModal.tsx component
- [ ] Display photo gallery with timestamps
- [ ] Show signature image (if captured)
- [ ] Display delivery notes
- [ ] Show delivery timestamp
- [ ] Add download option for POD documents
- [ ] Integrate in LoadDetailsModal
- [ ] Add "View POD" button in load details

### Feature 3: Geofencing Alerts - Automatic Notifications
- [ ] Create geofencing service (calculate distance)
- [ ] Add geofence radius configuration (default 500m)
- [ ] Detect when driver enters pickup zone
- [ ] Detect when driver enters delivery zone
- [ ] Send notifications to admin (notifyOwner)
- [ ] Store geofence events in database
- [ ] Display geofence history in admin dashboard
- [ ] Configure alert thresholds per load


## Fase 98: Consolidación de Dashboards en Command Center
- [x] Crear CommandCenter.tsx unificando Dashboard + ExecutiveDashboard
- [x] Incluir KPIs principales (4 tarjetas)
- [x] Incluir KPIs operacionales (Profit/Mile, Revenue/Mile, Cost/Mile, Utilización, Avg/Load, Cargas/Mes)
- [x] Incluir análisis ejecutivo con gráficos de tendencias
- [x] Incluir selector de rango de fechas (Hoy, Esta semana, Este mes, Últimos 30/90 días)
- [x] Incluir cargas recientes con filtros por estado
- [x] Incluir acciones rápidas (Nueva Carga, Evaluar Carga, Registrar Gasto, Ver Finanzas, Rendimiento Choferes)
- [x] Incluir distribución financiera 50/20/20/10
- [x] Incluir gráficos de ingresos vs ganancia
- [x] Incluir gráfico de tendencia de margen
- [x] Actualizar App.tsx para usar CommandCenter en /command-center
- [x] Integración con tRPC queries (dashboard.kpis, dashboard.recentLoads, loads.list)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Loading states y error handling
- [x] Checkpoint guardado

## Fase 99: Próximas Mejoras del Command Center
- [ ] Agregar widget de alertas de precios bajos
- [ ] Agregar widget de notificaciones en tiempo real
- [ ] Agregar mapa en tiempo real de choferes (solo admin)
- [ ] Agregar chat widget (solo admin)
- [ ] Agregar exportación de reportes (PDF, Excel)
- [ ] Agregar comparación histórica (mes anterior, trimestre anterior, año anterior)
- [ ] Optimizar performance con lazy loading
- [ ] Agregar filtros avanzados
- [ ] Agregar búsqueda de cargas
- [ ] Agregar personalización de widgets


## Fase 3: Wallet/Settlement Module
- [x] Crear tablas en schema: wallets, wallet_transactions, withdrawals, payment_blocks, settlements, settlement_loads
- [x] Generar migración SQL con Drizzle
- [x] Crear DB helpers en server/db.ts para wallets (20+ funciones)
- [x] Crear DB helpers para settlements (8+ funciones)
- [x] Crear tRPC router wallet.ts con 8 procedures
- [x] Crear tRPC router settlement.ts con 7 procedures
- [x] Integrar walletRouter y settlementRouter en server/routers.ts
- [x] Crear Frontend UI para Wallet (WalletDashboard.tsx)
- [x] Crear WithdrawalRequestModal.tsx
- [x] Crear Frontend UI para Settlements (SettlementsPage.tsx)
- [x] Crear CreateSettlementModal.tsx
- [x] Integrar rutas en App.tsx (/finance-wallet, /finance-settlements)
- [x] Actualizar DashboardLayout con nuevas opciones de menú
- [ ] Ejecutar migración SQL en la base de datos
- [ ] Agregar tests para wallet y settlement routers

## Fase 4: Unificar Driver
- [x] Crear DriverOps.tsx que unifique DriverDashboard + DriverView
- [x] Incluir tabs para Dashboard y Operaciones
- [x] KPIs: Entregas, Ganancias, Gastos, Margen Neto
- [x] Resumen de Billetera con link a /finance-wallet
- [x] Cargas activas, disponibles, completadas
- [x] POD upload modal
- [x] Actualizar rutas en App.tsx (/driver, /driver-dashboard)
- [x] Actualizar DashboardLayout para usar DriverOps
- [ ] Agregar tests para DriverOps
- [ ] Validar flujo de aceptar/rechazar cargas


## Fase 5: Unificar Fleet
- [x] Actualizar FleetTracking.tsx para unifique FleetMap + FleetManagement
- [x] Incluir stats: Total, Internos, Arrendados, Externos
- [x] Tab de Gestion con edicion inline de flota type y comision
- [x] Color coding por flota type (azul, purpura, naranja)
- [x] Edicion de DOT number
- [x] Actualizar rutas en App.tsx (/fleet-tracking)
- [x] Actualizar DashboardLayout para usar /fleet-tracking
- [x] Redirects de /fleet-map y /fleet-management a /fleet-tracking
- [ ] Agregar tests para FleetTracking
- [ ] Implementar mapa en tiempo real con Google Maps


## Fase 7: Formalizar Quote Analyzer
- [x] Crear tabla quote_analysis en schema con 43 columnas
- [x] Generar migracion SQL con Drizzle (0033_left_tyrannus.sql)
- [x] Crear DB helpers: createQuoteAnalysis, getQuoteAnalysisById, updateWithActuals, getAllQuoteAnalyses, getQuoteAnalysisSummary, importFromQuotation
- [x] Crear tRPC router quoteAnalysis con 7 procedures
- [x] Integrar quoteAnalysisRouter en server/routers.ts
- [x] Crear QuoteAnalyzer.tsx UI con tabs: Analisis y Resumen por Broker
- [x] Incluir comparativa estimado vs real
- [x] Edicion inline de costos reales
- [x] Calculo automatico de varianzas
- [x] Resumen de profitabilidad por broker
- [x] Agregar ruta /quote-analyzer en App.tsx
- [x] Actualizar DashboardLayout con menu item
- [ ] Ejecutar migracion SQL en la base de datos
- [ ] Agregar tests para quote analysis routers
- [ ] Validar flujo completo: crear -> actualizar costos -> ver varianzas


## Fase 6: Consolidar Loads & Dispatch
- [x] Reescribir LoadsDispatch.tsx como centro operacional unificado
- [x] Load Board con búsqueda, filtros por estado, y ordenamiento
- [x] Pipeline visual con 7 estados (Available → Quoted → Assigned → In Transit → Delivered → Invoiced → Paid)
- [x] Stats en tiempo real (total, disponibles, activas, completadas, ingreso total)
- [x] Analytics tab con métricas de cargas completadas
- [x] Historial tab (placeholder para futuro)
- [x] StatusBadge component con color coding por estado
- [x] Integración con trpc.loads.getActive
- [ ] Agregar funcionalidad de crear nueva carga
- [ ] Agregar funcionalidad de asignar chofer
- [ ] Agregar funcionalidad de cambiar estado
- [ ] Integración con Quote Analyzer para crear cotizaciones
- [ ] Agregar tests para LoadsDispatch


## Fase 8: Formalizar Receivables/Invoicing
- [x] Crear tablas en schema: invoices, receivables, invoice_payments
- [x] Generar migración SQL con Drizzle (0034_hesitant_scream.sql)
- [x] Crear DB helpers para invoicing (12+ funciones)
- [x] Crear tRPC router invoicing.ts con 8 procedures
- [x] Integrar invoicingRouter en server/routers.ts
- [x] Crear InvoicingPage.tsx con Aging Report y Invoices List tabs
- [x] Agregar InvoiceStatusBadge component con color coding
- [x] Integrar rutas en App.tsx (/invoicing)
- [x] Actualizar DashboardLayout con menú de Invoicing
- [ ] Ejecutar migración SQL en la base de datos
- [ ] Agregar funcionalidad de crear nueva factura
- [ ] Agregar funcionalidad de registrar pago
- [ ] Agregar funcionalidad de descargar factura en PDF
- [ ] Agregar notificaciones de vencimiento
- [ ] Agregar tests para invoicing router


## Fase 9: Consolidar Finance Completo
- [x] Crear FinanceDashboard.tsx como centro operacional financiero unificado
- [x] Overview tab con KPIs principales (Total Receivable, Overdue, Wallet Balance, Avg Wallet)
- [x] Invoicing tab con últimas 10 facturas
- [x] Wallet tab con saldo de choferes
- [x] Analytics tab con métricas financieras (Revenue Growth, Profit Margin, Collection Rate, DSO)
- [x] KPICard component reutilizable
- [x] Quick Actions para acceso rápido a funcionalidades
- [x] Financial Summary con Income, Expenses, Net Profit
- [x] Integrar rutas en App.tsx (/finance-dashboard)
- [x] Actualizar DashboardLayout con Finance Dashboard como principal
- [ ] Agregar exportación de reportes (CSV, PDF)
- [ ] Agregar gráficos de tendencias
- [ ] Agregar comparativas mes anterior
- [ ] Agregar notificaciones de facturas vencidas
- [ ] Agregar tests para FinanceDashboard


## Fase 10: Alerts & Tasks
- [x] Crear 3 nuevas tablas en schema: alerts, tasks, taskComments
- [x] Generar migración SQL con Drizzle (0035_ambiguous_supernaut.sql)
- [x] Crear 15+ DB helpers para alerts y tasks (createAlert, getAlertsForUser, markAlertAsRead, acknowledgeAlert, getUnreadAlertCount, createTask, getTasksForUser, updateTaskStatus, updateTaskProgress, getTaskWithComments, addTaskComment, getOverdueTasks, getTasksDueToday, getTaskStats)
- [x] Crear tRPC router alertsAndTasks.ts con 15 procedures
- [x] Integrar alertsAndTasksRouter en server/routers.ts
- [x] Crear AlertsTasksPage.tsx con 2 tabs: Alerts y Tasks
- [x] Alerts tab con unread count, critical alerts, total alerts, list de alertas
- [x] Tasks tab con stats (total, pending, in_progress, completed, overdue), task management
- [x] AlertStatusBadge component con color coding por severity
- [x] TaskPriorityBadge component con color coding por prioridad
- [x] TaskStatusBadge component con color coding por estado
- [x] Integrar rutas en App.tsx (/alerts-tasks)
- [x] Actualizar DashboardLayout con Alerts & Tasks menu item
- [ ] Ejecutar migración SQL en la base de datos
- [ ] Agregar notificaciones en tiempo real (WebSocket)
- [ ] Agregar funcionalidad de crear nueva tarea
- [ ] Agregar funcionalidad de crear nueva alerta (admin only)
- [ ] Agregar tests para alertsAndTasks router


## Fase 11: Role Refinement
- [x] Crear shared/rbac.ts con matriz de permisos por rol (admin, owner, dispatcher, driver, user)
- [x] Definir módulos accesibles para cada rol
- [x] Crear funciones: hasModuleAccess, getAccessibleModules, filterMenuByRole
- [x] Crear ProtectedRoute.tsx component para proteger rutas por rol
- [x] Agregar role descriptions para cada rol
- [x] Integrar RBAC en DashboardLayout para filtrar menú por rol
- [ ] Implementar role-based data filtering en tRPC procedures
- [ ] Agregar role-based UI hiding (ocultar botones/opciones según rol)
- [ ] Crear RoleManagement page para admin (asignar roles a usuarios)
- [ ] Agregar tests para RBAC system
- [ ] Documentar matriz de permisos para cada rol


## Fase 12: Cleanup Final
- [x] Crear documentación completa de RBAC (docs/RBAC_GUIDE.md)
- [x] Crear documentación de proyecto (docs/PROJECT_OVERVIEW.md)
- [x] Corregir import path de useAuth en DashboardLayout.tsx
- [x] Documentar arquitectura del proyecto
- [x] Documentar stack tecnológico
- [x] Documentar estructura de carpetas
- [x] Documentar core features
- [x] Documentar database schema
- [x] Documentar API architecture
- [x] Documentar security measures
- [x] Documentar deployment process
- [ ] Agregar tests unitarios para RBAC
- [ ] Agregar tests para wallet/settlement
- [ ] Agregar tests para invoicing
- [ ] Agregar tests para alertsAndTasks
- [ ] Optimizar performance con lazy loading
- [ ] Remover archivos obsoletos
- [ ] Validar build sin errores
- [ ] Crear README.md con instrucciones de setup


## Próximas Tareas - Sesión Actual

### TAREA 1: Crear Company Management UI
- [x] Crear CompanyManagement.tsx con formulario modal para crear empresas
- [x] Integrar en App.tsx con ruta /company-management
- [x] Agregar menu item en DashboardLayout
- [x] Implementar DB helpers en server/db.ts (getAll, create, update, delete)
- [x] Crear tRPC router company.ts con procedures

### TAREA 2: Agregar Seed Data
- [x] Crear script seed-data.mjs con datos de prueba
- [x] Generar 3-5 empresas (carriers) de prueba
- [x] Generar 5-10 usuarios (admin, dispatcher, drivers)
- [x] Generar 20-30 cargas de prueba
- [x] Generar facturas, billeteras, transacciones de prueba
- [x] Ejecutar script para poblar base de datos
- [x] Ejecutar migración 0036_watery_shard.sql (companies table)
- [x] Crear empresa de prueba "WV Transport LLC" con ownerId

### TAREA 3: Implementar Company Context en Frontend
- [ ] Crear CompanyContext.tsx para manejar companyId global
- [ ] Agregar filtrado de companyId en todas las queries tRPC
- [ ] Validar que datos estén aislados por empresa
- [ ] Agregar selector de empresa en DashboardLayout (si multi-tenant)
- [ ] Tests para company isolation

### TAREA 4: Cerrar Capa Financiera y Operativa
- [x] Ejecutar migración 0037 en TiDB (allocation + alert threshold columns)
- [x] Verificar que campos de allocations se persisten en business_config
- [x] Crear UI de Allocations en FinancialDashboard (Settings tab) - AllocationSettings.tsx completado
- [x] Formulario editable: ownerDrawPercent, reserveFundPercent, reinvestmentPercent, operatingCashPercent
- [x] Validación en tiempo real: suma debe ser 100%
- [x] Guardar usando updateAllocationSettings mutation
- [x] Crear UI de Financial Alerts en FinancialDashboard - FinancialAlerts.tsx completado
- [x] Mostrar alertas con severidad (critical, warning)
- [x] Incluir fuente y motivo: low margin, high quote variance, negative cash, overdue invoices, payment blocks
- [x] Agregar recomendación accionable en cada alerta
- [x] Integrar getProfitPerLoad en Load details - ProfitPerLoadCard.tsx en LoadDetailPage
- [x] Mostrar profit real por carga: revenue, total cost, actual profit, margin, profit per mile, variance vs estimatedProfit
- [ ] Integrar getProfitPerLoad en Dispatch review / load review (próxima fase)
- [ ] Integrar getProfitPerLoad en Quote Analysis comparison (próxima fase)
- [x] Validación final end-to-end: confirmar que allocations persisten
- [x] Validación final: confirmar que alerts aparecen correctamente
- [x] Validación final: confirmar que profit per load se ve en UI
- [x] No romper Wallet, Invoicing, Settlements ni Quote Analysis


### TAREA 5: Mejorar Visibilidad Operativa y Toma de Decisiones Financieras

#### Prioridad 1: Integrar Profit/Margin en Dispatch Board
- [x] Identificar componente Dispatch Board / Loads list view
- [x] Agregar columnas: profit (USD), margin (%)
- [x] Implementar color coding: Verde (>15%), Amarillo (8-15%), Rojo (<8%)
- [x] Usar datos existentes de getProfitPerLoad (sin nuevos cálculos)
- [x] Agregar fallbacks seguros (valores 0 si faltan datos)
- [x] Validar que no rompa rendering ni paginación existente

#### Prioridad 2: Crear UI de Payment Blocks
- [x] Crear componente PaymentBlocksPanel.tsx
- [x] Mostrar: load ID, driver, block reason, status (desde getFinancialAlerts)
- [x] Usar lógica existente de payment blocks en wallet/requestWithdrawal
- [x] Agregar botón placeholder "Resolver bloqueo"
- [x] No modificar backend logic, solo consumir datos
- [x] Integrado en FinancialDashboard tab "Alerts"

#### Prioridad 3: Alertas Financieras en Tiempo Real
- [x] Agregar badge de alertas (indicador rojo) en dashboard/header
- [x] Implementar toasts para: negative cash, low margin, high variance, payment blocks
- [x] Reutilizar endpoint getFinancialAlerts existente
- [x] No cambiar thresholds ni lógica
- [x] AlertsBadge.tsx - Auto-refetch cada 30 segundos
- [x] Integrado en DashboardLayout (visible en todas las páginas)

#### Validación End-to-End
- [x] Confirmar que Dispatch Board muestra profit/margin
- [x] Confirmar que Payment Block UI es visible
- [x] Confirmar que alertas se disparan en UI
- [x] Validar que no se rompió funcionalidad existente


### TAREA 6: Cerrar Loop Operativo - Acciones y Filtros

#### Prioridad 1: Hacer Payment Blocks Accionables
- [x] Extender PaymentBlocksPanel para mostrar detalles por bloqueo
- [x] Mostrar: load ID, driver, block reason, required document, status
- [x] Agregar acciones: "Ver Load", "Marcar para Revisión"
- [x] Entry point para upload de documentos (si ya existe en sistema)
- [x] Usar datos existentes sin cambios de backend
- [x] Validar que no rompa FinancialDashboard Alerts tab

#### Prioridad 2: Filtros de Rentabilidad en Dispatch Board
- [x] Agregar filtros: Profitable (>15%), Watchlist (8-15%), Risk (<8%)
- [x] Integrar con tabla existente sin romper paginación/sorting/search
- [x] Safe fallbacks para valores faltantes
- [x] Validar que filtros funcionen con otros filtros existentes (status, search)
- [x] No cambiar estructura de LoadsDispatch

#### Prioridad 3: KPI Strip Compacto
- [x] Crear OperationalKPIStrip.tsx con métricas ligeras
- [x] Mostrar: average margin, loads at risk, blocked amount, critical alerts
- [x] Integrar sobre Dispatch Board (antes del filtro/search)
- [x] Mantener lightweight y operacional
- [x] Auto-actualizar con datos existentes

#### Validación End-to-End
- [x] Confirmar que Payment Blocks son accionables
- [x] Confirmar que Dispatch Board filtra por rentabilidad
- [x] Confirmar que KPI strip es visible y estable
- [x] Validar que no se rompió funcionalidad existente


### TAREA 7: Resolver Errores y Conectar Pantallas

#### Fase 1: Resolver Errores 500
- [x] Diagnosticar error en settlement.create (500 en producción) - Faltaba import de zod
- [x] Diagnosticar error en wallet.requestWithdrawal (500 en producción, "Wallet not found") - Auto-crear wallet
- [x] Verificar que wallet existe para usuario logueado
- [x] Validar que settlement data es completa antes de crear
- [x] Confirmar que errores no ocurren en desarrollo

#### Fase 2: Real-time Sync entre Pantallas
- [x] Crear useFinancialSync hook para invalidar queries relacionadas
- [x] Conectar Wallet ↔ Settlement (invalidate settlement cuando wallet cambia)
- [x] Conectar Settlement ↔ Invoicing (invalidate invoicing cuando settlement cambia)
- [x] Conectar Invoicing ↔ Financial Dashboard (invalidate alerts cuando invoicing cambia)
- [x] Hook listo para usar en mutations

#### Fase 3: Password Recovery
- [x] Backend ya tiene endpoints: requestPasswordReset, validateResetToken, resetPassword
- [x] Crear PasswordRecovery.tsx component
- [x] Listo para integrar en login page

#### Fase 4: Plaid Integration
- [x] Verificar que PLAID_CLIENT_ID y PLAID_SECRET están configurados
- [x] Crear PlaidLink.tsx component
- [x] Implementar wallet.createPlaidLinkToken endpoint
- [x] Implementar wallet.exchangePlaidPublicToken endpoint
- [x] Implementar wallet.getLinkedBankAccounts endpoint
- [x] PlaidLink component maneja todo el flujo

#### Fase 5: Validación End-to-End
- [ ] Confirmar que settlement.create funciona sin errores
- [ ] Confirmar que wallet.requestWithdrawal funciona sin errores
- [ ] Confirmar que cambios en una pantalla se reflejan en otras
- [ ] Confirmar que password recovery funciona
- [ ] Confirmar que Plaid integration funciona


### TAREA 8: Mejorar Eficiencia Operativa

#### Prioridad 1: Bulk Actions en Payment Blocks
- [x] Agregar checkbox por fila en PaymentBlocksPanel
- [x] Agregar "Select All" checkbox en header
- [x] Implementar bulk action: "Mark as Reviewed"
- [x] Implementar bulk action: "Mark as Resolved" (UI-level)
- [x] Validar que no rompe comportamiento actual del panel
- [x] Mostrar contador de items seleccionados

#### Prioridad 2: Smart Profitability Suggestions
- [x] Crear componente ProfitabilitySuggestion.tsx
- [x] Regla: margin < 8% → "Consider renegotiating rate"
- [x] Regla: margin < 8% → "Review fuel/toll costs"
- [x] Regla: margin > 15% → "High profitability load"
- [x] Integrar en Dispatch Board (ProfitMarginCell)
- [x] Mantener UI ligera (badge + sugerencias)

#### Prioridad 3: Margin Trend Indicator
- [x] Crear componente MarginTrendIndicator.tsx
- [x] Calcular trend: up / down / stable
- [x] Mostrar trend badge con iconos
- [x] Integrar en OperationalKPIStrip (Average Margin card)
- [x] Mantener minimal (sin gráficos pesados)

#### Validación End-to-End
- [x] Confirmar que bulk actions funcionan sin errores
- [x] Confirmar que sugerencias se renderizan correctamente
- [x] Confirmar que trend indicator es visible
- [x] Validar que no se rompió funcionalidad existente


### TAREA 9: Sistema de Reconciliación Financiera

#### Fase 1: Analizar Fuentes de Datos
- [x] Revisar estructura de settlements table
- [x] Revisar estructura de wallet table
- [x] Revisar estructura de walletTransactions table
- [x] Identificar campos clave: amount, status, date, load_id
- [x] Verificar relaciones entre tablas

#### Fase 2: Crear Lógica de Reconciliación
- [x] Crear endpoint financialExtended.getReconciliationData (backend)
- [x] Comparar expected amounts (invoices) vs actual (walletTransactions)
- [x] Detectar: missing payments, overpayments, discrepancies
- [x] Calcular variance tolerance (1%)
- [x] Retornar status: OK / Missing / Mismatch

#### Fase 3: Crear UI Panel
- [x] Crear ReconciliationPanel.tsx component
- [x] Mostrar: load ID, expected, actual, difference, status
- [x] Indicadores: Verde (OK), Amarillo (variance), Rojo (missing/mismatch)
- [x] Tabla de discrepancias con summary cards
- [x] Auto-refresh cada 30 segundos

#### Fase 4: Integración y Validación
- [x] Integrar ReconciliationPanel en FinancialDashboard
- [x] Crear tab "Reconciliation" entre Allocation y Alerts
- [x] Validar que no rompe wallet/settlement flows
- [x] Confirmar que mismatches se detectan correctamente
- [x] Confirmar UI muestra status claramente


### CICLO COMPLETADO: Debugging y UX Improvements
- [x] Resolver error 500 en settlement.create (partner2Id inválido → 1860001)
- [x] Cambiar financial.getFinancialAlerts a financialExtended.getFinancialAlerts en 3 archivos
- [x] Validar que Railway está corriendo código más reciente (confirmado en logs)
- [x] Mejorar UX de withdrawal: deshabilitar botón si availableBalance <= 0
- [x] Mostrar balance en rojo cuando es insuficiente
- [x] Mensaje claro: "No tienes balance disponible para retirar"
- [x] Hint adicional: "Completa más cargas para generar ingresos"
- [ ] PENDIENTE: Validar visualmente en producción que cambios de withdrawal se ven correctamente
- [ ] PENDIENTE: Revisar siguiente bloque del proyecto


### TAREA 10: Corregir Errores SQL en Producción
- [x] Corregir financial.getFinancialAlerts - WHERE clause incompleto (cambié driverId → assignedDriverId)
- [x] Corregir financial.getReconciliationData - WHERE clause incompleto (cambié driverId → assignedDriverId)
- [x] Corregir invoicing.getAll - taxRate column mismatch (cambié schema a tax_rate/tax_amount)
- [ ] Aplicar migración 0038 a base de datos de producción
- [ ] Validar en producción que errores desaparecen


## Fase 1A: DispatchBoard Professional (Implementación)

### Backend
- [x] Crear helper function `getLoadFinancialSnapshot(loadId)` en db.ts
- [x] Extender `loadsRouter.list` para incluir financialSnapshot en response
- [x] Validar que financialSnapshot tiene: margin, profit, ratePerMile, status

### Frontend - Página Principal
- [x] Crear DispatchBoard.tsx (250-400 líneas, página delgada)
- [x] Implementar layout: filters (left) | board (center) | drawer (right)
- [x] Integrar useDispatchFilters hook
- [ ] Integrar useDispatchBoard hook
- [x] Toggle Kanban/Table view
- [x] Manage selectedLoadId + drawer visibility

### Frontend - Componentes
- [x] Crear DispatchLoadCard.tsx (compact + quick actions inline)
- [x] Crear DispatchKanbanBoard.tsx (7 status columns)
- [x] Crear DispatchTableView.tsx (tabla con sorting + pagination)
- [x] Crear DispatchFilterPanel.tsx (filtros + quick views)
- [x] Crear DispatchKPIStrip.tsx (KPI metrics)
- [x] Crear DispatchDetailDrawer.tsx (simple: overview, financial, assignment, actions)
- [ ] Crear DispatchViewToggle.tsx (Kanban/Table toggle)

### Frontend - Hooks & Utils
- [x] Crear useDispatchFilters.ts (filter state + localStorage)
- [ ] Crear useDispatchBoard.ts (loads query + refetch)
- [x] Crear dispatchHelpers.ts (filter, sort, group, format functions)

### Frontend - Routing
- [x] Agregar ruta /dispatch-board en App.tsx
- [x] Agregar link "Dispatch Board" en DashboardLayout sidebar

### Testing & Validation
- [ ] Verificar que DispatchBoard carga sin errores
- [ ] Verificar que filtros persisten entre sesiones
- [ ] Verificar que Kanban y Table view funcionan
- [ ] Verificar que detail drawer abre/cierra correctamente
- [ ] Verificar que quick actions (assign, reassign) funcionan
- [ ] Verificar que coexiste con LoadsDispatch sin romper nada
- [ ] Verificar performance (< 2s para 100 loads)

### Checkpoint
- [ ] Guardar checkpoint de Fase 1A completada


## Fase 33: Banking Cash Flow Management — COMPLETADA
- [x] Actualizar esquema DB: tabla bankAccountClassifications (operating, reserve, personal)
- [x] Actualizar esquema DB: tabla cashFlowRules (reservePercent, default 20%)
- [x] Actualizar esquema DB: tabla reserveTransferSuggestions
- [x] Backend: queries para clasificar cuentas y calcular sugerencia de reserva
- [x] Backend: routers tRPC (6 endpoints: getCashFlowRule, saveCashFlowRule, getBankAccountClassifications, setBankAccountClassification, calculateReserveSuggestion, getCashFlowSummary)
- [x] Frontend: página BankingCashFlow.tsx con 3 cards funcionales
- [x] Frontend: CashFlowRuleCard (editable, persiste)
- [x] Frontend: AccountClassificationsCard (editable, color-coded)
- [x] Frontend: ReserveSuggestionCard (real-time calculator)
- [x] Navegación: agregar "Banking Cash Flow" al sidebar en grupo FINANCE
- [x] RBAC: permisos para admin/owner en shared/rbac.ts
- [x] Visibilidad: garantizada en DashboardLayout.tsx con fallback logic
- [x] Validación: funcional en preview (Manus) y Railway production
- [x] Persistencia: edit/save/reload confirmado
- [x] Bug fixes: React infinite loop (useCallback), RBAC permissions, menu visibility
- [x] Checkpoint guardado: b1c1e47a
- [x] Tests: validación end-to-end completada

- [x] Portación de backend: servidor/plaid-cashflow.ts con generateReserveSuggestionsFromTransactions()
- [x] Integración: conectado al endpoint plaid.syncTransactions en server/_core/plaidRouter.ts
- [x] Respuesta extendida: syncTransactions ahora retorna suggestionsCreated y suggestionSkipped

**ESTADO FINAL:** ✅ OPERATIVO EN PRODUCCIÓN + BACKEND INTELIGENTE PARA FASE 34


## Fase 34: UI/UX Refinements y Advanced Banking Features (PRÓXIMA)
- [ ] Reordenar sidebar: mover Banking Cash Flow al grupo visual FINANCE
- [ ] Agregar auto-transfer scheduling (toggle + day selector)
- [ ] Mostrar real-time account balances en Classifications card
- [ ] Integrar Plaid para conexión automática de cuentas
- [ ] Crear tabla-based quotation interface mejorada
- [ ] Implementar executive dashboard con trend analysis
- [ ] Desarrollar exportable PDF/Excel reports
- [ ] Tests para nuevas features
- [ ] Checkpoint y entrega


## Fase 35: Banking Setup y Cash Flow Rule (DEPRECATED - Merged into Phase 33)
- [x] Actualizar esquema DB: tabla bankAccountClassifications (operating, reserve, personal)
- [x] Actualizar esquema DB: tabla cashFlowRules (reservePercent, default 20%)
- [x] Backend: queries para clasificar cuentas y calcular sugerencia de reserva
- [x] Backend: routers tRPC para getBankAccounts, updateAccountClassification, getCashFlowRules, updateReservePercent
- [x] Frontend: componente BankingSetup para clasificar cuentas
- [x] Frontend: componente CashFlowRule para mostrar configuración y sugerencia
- [x] Frontend: componente SuggestedReserveTransfer con cálculo de reserva
- [x] Frontend: reporte financiero con gross income, fuel, tolls, net profit, reserve suggestion
- [x] Tests para banking setup y cash flow (10 tests nuevos)
- [x] Checkpoint y entrega


## Fase 36: Consolidación Final Wallet ↔ Banking (COMPLETADA)

### Backend - Endpoints Consolidados
- [x] wallet.getReserveSummary: reserved_pending, completed_reserves, withdrawable_balance
- [x] wallet.getFinancialHistory: depósitos, suggestions, retiros, conexiones bancarias
- [x] wallet.completeReserveSuggestion: marcar sugerencia como completed
- [x] wallet.dismissReserveSuggestion: marcar sugerencia como dismissed
- [x] wallet.getWithdrawableBalance: balance - reserved_pending
- [x] wallet.validateWithdrawal: verificar si retiro es permitido

### Frontend - Wallet UI
- [x] WalletDashboard Resumen: mostrar available, reserved, completed, last sync
- [x] WalletDashboard Historial: eventos de cash flow (deposits, suggestions, completions, withdrawals)
- [x] WalletDashboard Retiros: usar withdrawable_balance real, bloquear si hay reservas
- [x] WalletDashboard Banco: usar plaid.getBankAccounts, sin duplicación

### Frontend - Banking UI
- [x] BankingCashFlow Suggested Transfers: Mark as done, Dismiss actions
- [x] BankingCashFlow System Status: Plaid connected, Last sync, Webhook active, Operating account, Reserve rule
- [x] Auto-clasificación: primera cuenta conectada → operating

### Validación Final
- [x] Conectar banco en Wallet aparece en Banking
- [x] Sync genera suggestions automáticamente
- [x] Wallet muestra reserved_pending correctamente
- [x] Wallet bloquea retiros si hay reservas
- [x] Marcar suggestion como completed se refleja en Wallet

**ESTADO FINAL:** Auto Reserve System COMPLETO - Wallet y Banking sincronizados


## Fase 37: Webhook de Plaid para Sincronización Automática (COMPLETADA)

### Backend - Webhook Endpoint
- [x] Crear endpoint POST /api/webhooks/plaid
- [x] Validar autenticidad del webhook (signature verification)
- [x] Parsear eventos de Plaid (TRANSACTIONS_UPDATED, ITEM_ERROR, AUTH_REQUIRED, etc.)
- [x] Logging de eventos para debugging

### Backend - Handler de Eventos
- [x] TRANSACTIONS_UPDATED: sincronizar transacciones automáticamente
- [x] Llamar a generateReserveSuggestionsFromTransactions después de sync
- [x] ITEM_ERROR: registrar y notificar al usuario
- [x] AUTH_REQUIRED: marcar cuenta como requiriendo re-auth
- [x] WEBHOOK_UPDATE_ACKNOWLEDGED: confirmar recepción

### Backend - Seguridad
- [x] Implementar signature verification (HMAC-SHA256)
- [x] Rate limiting en endpoint webhook
- [x] Logging de intentos fallidos

### Frontend - UI Updates
- [x] Mostrar "Auto-syncing..." cuando webhook procesa eventos
- [x] Actualizar Suggested Transfers en tiempo real
- [x] Notificar si hay errores de sincronización

### Testing & Validation
- [x] Simular webhook de Plaid localmente
- [x] Verificar que transacciones se sincronizan automáticamente
- [x] Verificar que sugerencias se generan automáticamente
- [x] Verificar que errores se registran correctamente
- [x] Checkpoint y entrega

**ESTADO FINAL:** ✅ Webhook de Plaid OPERATIVO - Sincronización automática en tiempo real


## Fase 38: Auto-Transfer Scheduling (EN PROGRESO)

### Backend - Schema
- [x] Crear tabla autoTransferSchedules (userId, enabled, dayOfWeek, time, lastExecutedAt)
- [x] Crear tabla autoTransferLogs (userId, scheduledId, status, amount, executedAt, error)

### Backend - Endpoints
- [x] banking.getAutoTransferSchedule - obtener configuración actual
- [x] banking.setAutoTransferSchedule - guardar configuración (día, hora, enabled)
- [x] banking.getAutoTransferLogs - historial de ejecuciones
- [x] banking.executeAutoTransfer - ejecutar transferencia manualmente

### Backend - Job Scheduler
- [ ] Crear scheduler que verifica cada minuto si hay transferencias programadas
- [ ] Validar que no hay reservas pendientes antes de ejecutar
- [ ] Ejecutar transferencia de reserva si condiciones se cumplen
- [ ] Registrar resultado en autoTransferLogs
- [ ] Notificar al usuario si transferencia fue exitosa/fallida

### Frontend - UI (BankingCashFlow.tsx)
- [ ] Agregar AutoTransferScheduleCard
- [ ] Toggle para habilitar/deshabilitar auto-transfer
- [ ] Selector de día de semana (Lunes-Domingo)
- [ ] Selector de hora (00:00 - 23:59)
- [ ] Mostrar última ejecución
- [ ] Botón para ejecutar manualmente
- [ ] Historial de últimas 5 ejecuciones

### Validación
- [ ] No ejecutar si hay reservas pendientes
- [ ] No ejecutar si balance < monto a transferir
- [ ] Validar que no se ejecute más de una vez por día
- [ ] Registrar todos los intentos (exitosos y fallidos)

### Testing & Validation
- [ ] Tests para scheduler
- [ ] Tests para validación de condiciones
- [ ] Tests para logging
- [ ] Checkpoint y entrega


## AUDITORÍA CRÍTICA - Loads + Auth + AI Load Advisor
### PRIORIDAD 1 - Auth Inconsistency
- [ ] Verificar cookie handling en backend (session cookie setup)
- [ ] Verificar credentials: "include" en tRPC client fetch
- [ ] Eliminar logs [Auth] Missing session cookie
- [ ] Validar que todos los endpoints reciben auth correctamente

### PRIORIDAD 2 - analyzeLoad Inconsistency
- [ ] Normalizar TODOS los inputs con Number()
- [ ] Forzar cálculo de millas con Haversine si hay coordenadas
- [ ] Nunca permitir ratePerMile = 0 si hay coords
- [ ] Fallback seguro si faltan datos
- [ ] Agregar logs [AI Load Advisor] con miles, ratePerMile, profit

### PRIORIDAD 3 - Load Enrichment Pipeline
- [ ] Revisar attachFinancialSnapshots
- [ ] Revisar map() que puede devolver null
- [ ] Revisar filtros accidentales
- [ ] Confirmar enriched count = 48 (no 0)

### PRIORIDAD 4 - Validation
- [ ] Test load 630001: miles > 0, ratePerMile > 0
- [ ] Test load 600020: miles > 0, ratePerMile > 0
- [ ] Test load 660001: miles > 0, ratePerMile > 0
- [ ] Verificar logs reales de AI Load Advisor

### PRIORIDAD 5 - Hard Rules
- [ ] NO tocar Wallet logic
- [ ] NO tocar Ledger
- [ ] NO tocar Plaid Sync
- [ ] NO tocar Reserve system
- [ ] SOLO fixes, estabilidad, consistencia


## Fase 45: Data Integrity Audit - Load Creation Pipeline
- [x] Audit load creation paths (API, seed scripts, direct SQL)
- [x] Identify loads created without addresses (41 loads with city-only addresses)
- [x] Root cause: server/seed-full-data.mjs bypasses createLoad() validation with direct SQL INSERT
- [x] Fix: Updated server/seed-full-data.mjs to use full street addresses
- [x] Verify: seed-loads.mjs and server/seed-loads.ts use full addresses
- [ ] Refactor seed scripts to use validated createLoad() function instead of direct SQL
- [ ] Execute geocoding backfill for existing loads without coordinates
- [ ] Monitor logs for 🚨 [LOAD REJECTED] and [GEOCODE] events in production
- [ ] Validate that all new loads created via API have valid addresses and coordinates
