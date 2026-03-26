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


## Bugs Reportados
- [x] Google Maps cargándose múltiples veces en /driver (error: "You have included the Google Maps JavaScript API multiple times") — RESUELTO: agregada verificación global y de DOM

- [x] Consulta SQL de flujo de caja fallando en /driver (GROUP BY MONTH issue) — RESUELTO: migrado a raw SQL con db.execute()


## Fase 11: Asignación de Cargas del Gestor al Chofer
- [x] Actualizar esquema DB: tabla loadAssignments con relaciones
- [x] Crear routers tRPC: assignLoad, getAssignments, updateAssignmentStatus
- [x] Crear modal de asignación con búsqueda y filtros
- [x] Agregar vista de asignaciones en Dashboard del Gestor
- [x] Notificaciones al chofer cuando recibe asignación
- [x] Tests para asignación de cargas (8 tests nuevos)
- [ ] Checkpoint y entrega

- [x] Error en /loads: "Cannot read properties of undefined (reading 'expenses')" — RESUELTO: agregada validación defensiva con optional chaining en Finance.tsx
