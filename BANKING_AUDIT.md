# Banking Integration Audit

## Estado Actual

### plaidRouter (server/_core/plaidRouter.ts)
Endpoints:
- `createLinkToken` - ✅ FUNCIONA: Usa createPlaidLinkToken() de plaid.ts
- `exchangeToken` - ✅ FUNCIONA: Usa exchangePublicToken() de plaid.ts, guarda en bank_accounts con plaidItemId
- `getBankAccounts` - ✅ FUNCIONA: Retorna cuentas activas con plaidItemId IS NOT NULL
- `removeBankAccount` - ✅ FUNCIONA: Valida ownership, desactiva cuenta
- `getSyncStatus` - ✅ FUNCIONA
- `removed` - ⚠️ DEPRECATED: No se usa

### walletRouter (server/routers/wallet.ts)
Endpoints:
- `createPlaidLinkToken` - ❌ ROTO: Hace fetch directo a sandbox.plaid.com, no usa plaid.ts
- `exchangePlaidPublicToken` - ⚠️ DUPLICADO: Hace fetch directo, no usa plaid.ts, guarda en bank_accounts pero SIN plaidItemId
- `getLinkedBankAccounts` - ⚠️ DUPLICADO: Filtra por isActive pero NO por plaidItemId, retorna formato diferente

### bankingRouter (server/routers.ts)
Endpoints:
- `getBankAccountClassifications` - ✅ FUNCIONA: Usa db.ts
- `setBankAccountClassification` - ✅ FUNCIONA: Usa db.ts
- `getCashFlowRule` - ✅ FUNCIONA: Usa db.ts
- `saveCashFlowRule` - ✅ FUNCIONA: Usa db.ts
- `getReserveSuggestions` - ✅ FUNCIONA: Usa db.ts
- `markReserveSuggestionCompleted` - ✅ FUNCIONA: Usa db.ts

## Problemas Identificados

### 1. Duplicación de Plaid Logic
- wallet.createPlaidLinkToken vs plaid.createLinkToken
  - Wallet: fetch directo a sandbox
  - Plaid: usa cliente configurado, respeta PLAID_ENV
  
- wallet.exchangePlaidPublicToken vs plaid.exchangeToken
  - Wallet: fetch directo, NO guarda plaidItemId
  - Plaid: usa cliente, devuelve itemId correctamente

### 2. Inconsistencia en getLinkedBankAccounts
- wallet.getLinkedBankAccounts: NO filtra por plaidItemId
- plaid.getBankAccounts: Filtra por plaidItemId IS NOT NULL
- Resultado: Wallet muestra cuentas inválidas sin itemId

### 3. Falta de Unificación en Frontend
- BankConnectionPanel.tsx usa trpc.wallet.getLinkedBankAccounts
- BankingCashFlow.tsx usa trpc.plaid.getBankAccounts
- Mismo componente, diferentes endpoints, diferentes datos

## Plan de Consolidación

### Fase 1: Eliminar walletRouter Plaid Logic
- Remover wallet.createPlaidLinkToken
- Remover wallet.exchangePlaidPublicToken
- Remover wallet.getLinkedBankAccounts

### Fase 2: Crear Endpoints Unificados en plaidRouter
- Mantener plaid.createLinkToken (ya funciona)
- Mantener plaid.exchangeToken (ya funciona)
- Mantener plaid.getBankAccounts (ya funciona)

### Fase 3: Actualizar Frontend
- BankConnectionPanel.tsx: usar trpc.plaid.* en lugar de trpc.wallet.*
- Ambas pantallas usan los mismos endpoints

### Fase 4: Validar End-to-End
- Wallet: conectar cuenta → ver en Banking
- Banking: conectar cuenta → ver en Wallet
- Eliminar en una pantalla → desaparece en la otra
