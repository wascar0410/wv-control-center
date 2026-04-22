# Plaid Consolidation Report — Final Audit

**Date:** 2026-04-20  
**Status:** ✅ CONSOLIDATION COMPLETE

---

## Executive Summary

Toda la lógica Plaid está centralizada en una única capa de servicio (`plaid.ts`). No hay duplicación de código. Wallet y Banking usan exactamente los mismos endpoints y funciones. Una única fuente de verdad para cuentas bancarias: `bank_accounts`.

---

## Capa Centralizada: plaid.ts

**Ubicación:** `server/_core/plaid.ts`

**Funciones Exportadas:**

1. **`isPlaidConfigured()`** — Valida que PLAID_CLIENT_ID y PLAID_SECRET estén configurados
2. **`getPlaidClient()`** — Retorna cliente Plaid configurado (singleton)
   - Usa `ENV.PLAID_ENV` para determinar sandbox vs production
   - Respeta configuración centralizada, sin hardcoding
3. **`createLinkToken(userId, redirectUri?)`** — Crea link token para Plaid Link
   - Retorna `link_token` válido
   - Incluye webhook en producción
4. **`exchangePublicToken(publicToken)`** — Intercambia token público por access token
   - Retorna `{ accessToken, itemId }`
   - itemId es crítico para sincronización
5. **`getAccounts(accessToken)`** — Obtiene cuentas del usuario
   - Retorna array de cuentas con `account_id`, `name`, `subtype`, `mask`
6. **`getTransactions(accessToken, startDate, endDate)`** — Obtiene transacciones
7. **`syncTransactionsForItem(accessToken, cursor?)`** — Sincroniza transacciones con cursor

**Características:**

- ✅ Cliente Plaid configurado una sola vez (singleton)
- ✅ Respeta PLAID_ENV (sandbox/development/production)
- ✅ Sin hardcoding de URLs
- ✅ Manejo centralizado de errores
- ✅ Logging exhaustivo

---

## Endpoints Consolidados

### plaidRouter (server/_core/plaidRouter.ts)

**Ruta:** `/api/trpc/plaid.*`

| Endpoint | Tipo | Función | Fuente |
|----------|------|---------|--------|
| `createLinkToken` | mutation | Crea link token para Plaid Link | `plaid.createLinkToken()` |
| `exchangeToken` | mutation | Intercambia token, guarda en DB | `plaid.exchangePublicToken()` + `createBankAccount()` |
| `getBankAccounts` | query | Retorna cuentas activas con plaidItemId | `getBankAccountsByUserId()` (filtrado) |
| `removeBankAccount` | mutation | Desactiva cuenta (isActive=false) | `deactivateBankAccount()` |
| `syncTransactions` | mutation | Sincroniza transacciones | `syncPlaidTransactionsForItem()` |
| `getSyncStatus` | query | Estado del último sync | DB query |

**Características:**

- ✅ Todos usan funciones de plaid.ts
- ✅ Validación de ownership en operaciones protegidas
- ✅ Logging exhaustivo en cada paso
- ✅ Manejo centralizado de errores

---

## Eliminación de Duplicación

### walletRouter (server/routers/wallet.ts)

**Antes:**
- `wallet.createPlaidLinkToken` — Fetch directo a sandbox.plaid.com ❌
- `wallet.exchangePlaidPublicToken` — Fetch directo, NO guardaba plaidItemId ❌
- `wallet.getLinkedBankAccounts` — NO filtraba por plaidItemId ❌

**Después:**
- ✅ Removidos 3 endpoints
- ✅ Reemplazados con comentario que apunta a plaidRouter
- ✅ Wallet ahora usa `trpc.plaid.*` en lugar de `trpc.wallet.*`

---

## Fuente Única de Verdad: bank_accounts

**Tabla:** `bank_accounts` (MySQL/TiDB)

**Estructura:**
```sql
CREATE TABLE bank_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  bankName VARCHAR(255),
  accountType ENUM('checking', 'savings', 'credit_card', 'other'),
  accountLast4 VARCHAR(4),
  plaidAccountId VARCHAR(255) NOT NULL,
  plaidAccessToken VARCHAR(255) NOT NULL,
  plaidItemId VARCHAR(255),
  isActive BOOLEAN DEFAULT true,
  lastSyncedAt TIMESTAMP,
  plaidSyncCursor TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (userId, plaidAccountId),
  KEY (isActive)
);
```

**Acceso:**
- Wallet: `trpc.plaid.getBankAccounts` → `getBankAccountsByUserId()` (filtrado)
- Banking: `trpc.plaid.getBankAccounts` → `getBankAccountsByUserId()` (filtrado)
- Ambas usan exactamente la misma función

**Filtrado en Backend:**
```typescript
// db.ts: getBankAccountsByUserId()
where(
  and(
    eq(bankAccounts.userId, userId),
    eq(bankAccounts.isActive, true),
    isNotNull(bankAccounts.plaidItemId)
  )
)
```

---

## Frontend Consolidación

### Componentes Actualizados

| Componente | Cambio | Resultado |
|------------|--------|-----------|
| `BankConnectionPanel.tsx` | wallet.* → plaid.* | ✅ Usa endpoints unificados |
| `PlaidLink.tsx` | wallet.* → plaid.* | ✅ Usa endpoints unificados |
| `PlaidLinkButton.tsx` | Ya usaba plaid.* | ✅ Sin cambios necesarios |
| `WithdrawalRequestModal.tsx` | wallet.getLinkedBankAccounts → plaid.getBankAccounts | ✅ Usa endpoint unificado |
| `BankingCashFlow.tsx` | Ya usaba plaid.* | ✅ Sin cambios necesarios |

---

## Flujo End-to-End Validado

### Escenario 1: Conectar desde Wallet

1. Usuario abre Wallet
2. Hace clic en "Vincular Cuenta Bancaria"
3. Frontend llama `trpc.plaid.createLinkToken.mutateAsync()`
4. Backend llama `plaid.createLinkToken()` → Plaid API
5. Plaid Link se abre
6. Usuario completa conexión
7. Frontend llama `trpc.plaid.exchangeToken.mutateAsync({ publicToken })`
8. Backend:
   - Llama `plaid.exchangePublicToken()` → obtiene accessToken + itemId
   - Llama `plaid.getAccounts()` → obtiene cuentas
   - Para cada cuenta: `createBankAccount()` → inserta en DB con plaidItemId
9. Cuenta aparece en Wallet

### Escenario 2: Ver en Banking

1. Usuario abre Banking Cash Flow
2. Componente llama `trpc.plaid.getBankAccounts.useQuery()`
3. Backend retorna cuentas activas con plaidItemId
4. **Misma cuenta que en Wallet aparece aquí**

### Escenario 3: Force Sync

1. Usuario hace clic "Force Sync (Debug)"
2. Frontend llama `trpc.plaid.syncTransactions.useMutation()`
3. Backend:
   - Obtiene cuenta de DB (con plaidItemId)
   - Llama `syncPlaidTransactionsForItem()` → Plaid API
   - Importa transacciones
   - Genera sugerencias
4. Transacciones aparecen en Banking

### Escenario 4: Eliminar desde Banking

1. Usuario hace clic botón Trash en Banking
2. Confirm dialog
3. Frontend llama `trpc.plaid.removeBankAccount.mutateAsync()`
4. Backend:
   - Valida ownership
   - Llama `deactivateBankAccount()` → isActive = false
5. Cuenta desaparece de Banking
6. **Cuenta también desaparece de Wallet** (mismo endpoint)

---

## Lógica Duplicada Eliminada

| Lógica | Ubicación Anterior | Ubicación Actual | Estado |
|--------|-------------------|------------------|--------|
| Crear link token | wallet.ts (fetch directo) | plaid.ts (cliente) | ✅ Centralizado |
| Intercambiar token | wallet.ts (fetch directo) | plaid.ts (cliente) | ✅ Centralizado |
| Obtener cuentas | wallet.ts (DB query) | db.ts (con filtrado) | ✅ Centralizado |
| Persistencia | wallet.ts (insert/update) | plaidRouter.ts → db.ts | ✅ Centralizado |
| Desactivar cuenta | plaidRouter.ts | plaidRouter.ts | ✅ Ya centralizado |

---

## Validación de Seguridad

- ✅ Ownership validado en `removeBankAccount`
- ✅ Solo cuentas activas con plaidItemId se retornan
- ✅ Access tokens almacenados encriptados en DB
- ✅ No hay exposición de credenciales Plaid en frontend
- ✅ Webhook validado en producción

---

## Endpoints Finales (Consolidados)

**Todos bajo `/api/trpc/plaid.*`:**

```typescript
trpc.plaid.createLinkToken.useMutation()
trpc.plaid.exchangeToken.useMutation()
trpc.plaid.getBankAccounts.useQuery()
trpc.plaid.removeBankAccount.useMutation()
trpc.plaid.syncTransactions.useMutation()
trpc.plaid.getSyncStatus.useQuery()
```

**Wallet usa:**
- `createLinkToken` ✅
- `exchangeToken` ✅
- `getBankAccounts` ✅
- `removeBankAccount` ✅

**Banking usa:**
- `getBankAccounts` ✅
- `syncTransactions` ✅
- `removeBankAccount` ✅
- `getSyncStatus` ✅

---

## Conclusión

✅ **Consolidación Completa Validada**

- Una única capa de servicio Plaid en `plaid.ts`
- Una única fuente de verdad: `bank_accounts`
- Wallet y Banking usan exactamente los mismos endpoints
- Sin duplicación de código
- Flujo end-to-end validado: conectar → ver en ambas → sync → eliminar
- Seguridad y ownership validados
