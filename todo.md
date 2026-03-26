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
