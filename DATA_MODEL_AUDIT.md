# Data Model Audit: Fuente Única de Verdad

## Objetivo
Consolidar Wallet + Banking Cash Flow como un único sistema financiero sincronizado con una única fuente de verdad.

---

## Tablas Financieras Centrales

### 1. `bank_accounts` (línea 334 en schema.ts)
**Fuente de verdad para cuentas bancarias conectadas**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `userId` | int | FK → users.id |
| `bankName` | varchar | Nombre del banco |
| `accountType` | enum | checking, savings, credit_card, other |
| `accountLast4` | varchar | Últimos 4 dígitos |
| `plaidAccountId` | varchar | ID de cuenta en Plaid |
| `plaidAccessToken` | text | Token de acceso Plaid |
| `plaidItemId` | varchar | ID de item Plaid (necesario para sync) |
| `isActive` | boolean | Activa/desactivada |
| `lastSyncedAt` | timestamp | Último sync |

**Usuarios:**
- Wallet (lectura: conectadas, desconectar)
- Banking (lectura: conectadas, clasificaciones, sync)
- Plaid router (lectura/escritura: crear, actualizar)

---

### 2. `bank_account_classifications` (línea 1807 en schema.ts)
**Clasificación de cuentas para cash flow**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `bankAccountId` | int | FK → bank_accounts.id (UNIQUE) |
| `classification` | enum | operating, reserve, personal |
| `label` | varchar | Etiqueta personalizada |
| `description` | text | Descripción |
| `isActive` | boolean | Activa |

**Usuarios:**
- Banking (lectura/escritura: clasificar cuentas)
- Wallet (lectura: mostrar clasificación)
- Auto Reserve System (lectura: identificar operating/reserve)

---

### 3. `cash_flow_rules` (línea 1831 en schema.ts)
**Configuración de reglas de cash flow por usuario**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `ownerId` | int | FK → users.id |
| `reservePercent` | decimal | % de depósitos para reserva (default 20%) |
| `minReserveAmount` | decimal | Mínimo a reservar |
| `maxReserveAmount` | decimal | Máximo a reservar |
| `autoTransferEnabled` | boolean | Habilitar auto-transfer |
| `autoTransferDay` | int | Día del mes para auto-transfer |
| `operatingAccountId` | int | FK → bank_accounts.id |
| `reserveAccountId` | int | FK → bank_accounts.id |

**Usuarios:**
- Banking (lectura/escritura: configurar reglas)
- Auto Reserve System (lectura: aplicar reglas)
- Wallet (lectura: mostrar configuración)

---

### 4. `reserve_transfer_suggestions` (línea 1858 en schema.ts)
**Sugerencias de transferencia de reserva (AUTO RESERVE SYSTEM)**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `ownerId` | int | FK → users.id |
| `fromAccountId` | int | FK → bank_accounts.id (operating) |
| `toAccountId` | int | FK → bank_accounts.id (reserve) |
| `suggestedAmount` | decimal | Monto sugerido |
| `transferredAmount` | decimal | Monto transferido (si completada) |
| `status` | enum | **suggested, approved, completed, dismissed, failed** |
| `reason` | varchar | Razón de la sugerencia |
| `transactionId` | int | FK → transactions.id |

**Estados:**
- `suggested` → Creada automáticamente por webhook/sync
- `approved` → Usuario aprobó en Banking
- `completed` → Transferencia ejecutada
- `dismissed` → Usuario rechazó
- `failed` → Intento de transferencia falló

**Usuarios:**
- Auto Reserve System (escritura: crear sugerencias)
- Banking (lectura/escritura: aprobar, marcar completada)
- Wallet (lectura: mostrar en Resumen, Historial)

---

### 5. `wallets` (línea 1244 en schema.ts)
**Billetera del usuario (driver)**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `driverId` | int | FK → users.id (UNIQUE) |
| `totalEarnings` | decimal | Total ganado |
| `availableBalance` | decimal | Balance disponible |
| `pendingBalance` | decimal | Balance pendiente |
| `blockedBalance` | decimal | Balance bloqueado |
| `status` | enum | active, suspended, closed |

**Nota:** Esta tabla es para driver earnings. Para Wallet financiera del owner, usamos `bank_accounts` + `reserve_transfer_suggestions`.

---

### 6. `wallet_transactions` (línea 1307 en schema.ts)
**Historial de transacciones de billetera**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `walletId` | int | FK → wallets.id |
| `type` | enum | load_payment, withdrawal, adjustment, fee, bonus, refund, chargeback |
| `amount` | decimal | Monto |
| `status` | enum | pending, completed, failed, reversed |

**Usuarios:**
- Wallet (lectura: mostrar en Historial)

---

### 7. `withdrawals` (línea 1344 en schema.ts)
**Solicitudes de retiro**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `walletId` | int | FK → wallets.id |
| `amount` | decimal | Monto |
| `fee` | decimal | Comisión |
| `netAmount` | decimal | Monto neto |
| `status` | enum | requested, approved, processing, completed, failed, cancelled |

**Usuarios:**
- Wallet (lectura/escritura: solicitar retiro)

---

### 8. `transactions` (línea ~600 en schema.ts)
**Transacciones importadas de Plaid**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `userId` | int | FK → users.id |
| `bankAccountId` | int | FK → bank_accounts.id |
| `amount` | decimal | Monto |
| `type` | enum | income, expense, transfer |
| `category` | varchar | Categoría |
| `externalTransactionId` | varchar | ID único de Plaid |

**Usuarios:**
- Plaid sync (escritura: importar transacciones)
- Auto Reserve System (lectura: detectar depósitos)
- Banking (lectura: mostrar transacciones)
- Wallet (lectura: mostrar en Historial)

---

## Flujo de Datos: Auto Reserve System v1

```
Plaid Webhook (SYNC_UPDATES_AVAILABLE)
    ↓
syncPlaidTransactionsForItem()
    ↓
Importar transacciones en `transactions`
    ↓
generateReserveSuggestionsFromTransactions()
    ↓
Crear fila en `reserve_transfer_suggestions` con status='suggested'
    ↓
Wallet muestra en Resumen + Historial
    ↓
Banking muestra en Suggested Transfers
    ↓
Usuario: Mark as done / Dismiss
    ↓
Status → approved / dismissed
    ↓
Si approved: ejecutar transferencia real (futuro)
    ↓
Status → completed / failed
```

---

## Endpoints Consolidados (Backend)

### Plaid Router (`server/_core/plaidRouter.ts`)
- `plaid.createLinkToken` → Crear link token
- `plaid.exchangeToken` → Intercambiar token público, guardar en DB
- `plaid.getBankAccounts` → Listar cuentas activas (filtra: isActive=true, plaidItemId IS NOT NULL)
- `plaid.removeBankAccount` → Desactivar cuenta (isActive=false)
- `plaid.syncTransactions` → Forzar sync manual

### Banking Router (futuro)
- `banking.getReserveSuggestions` → Listar sugerencias
- `banking.markReserveSuggestionCompleted` → Marcar completada
- `banking.getClassifications` → Listar clasificaciones
- `banking.updateClassification` → Actualizar clasificación

### Wallet Router (futuro)
- `wallet.getReserveSummary` → Resumen de reservas
- `wallet.getFinancialHistory` → Historial consolidado
- `wallet.getWithdrawableBalance` → Balance retirable
- `wallet.dismissReserveSuggestion` → Descartar sugerencia
- `wallet.completeReserveSuggestion` → Marcar completada

---

## Validaciones de Integridad

✅ **Todas las tablas financieras existen en schema.ts**
✅ **Wallet y Banking comparten las mismas tablas**
✅ **No hay duplicación de lógica de cuentas**
✅ **Enum de status actualizado: suggested, approved, completed, dismissed, failed**

---

## Próximos Pasos

1. **Fase 2:** Implementar Auto Reserve System v1 en webhook
2. **Fase 3:** Crear endpoints backend consolidados
3. **Fase 4:** Actualizar UI de Wallet
4. **Fase 5:** Mejorar UX de Banking
5. **Fase 6:** Validación end-to-end
