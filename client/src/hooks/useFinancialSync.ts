import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook to synchronize financial data across screens
 * Invalidates related queries when one changes
 */
export function useFinancialSync() {
  const utils = trpc.useUtils();

  // When wallet changes, invalidate related queries
  const invalidateWalletDependents = () => {
    // Invalidate settlement data
    utils.settlement.list.invalidate();
    utils.settlement.getById.invalidate();
    
    // Invalidate financial dashboard
    utils.financialExtended.getFinancialAlerts.invalidate();
    utils.financial.getAllocationSettings.invalidate();
    utils.financial.getProfitPerLoad.invalidate();
    
    // Invalidate invoicing
    utils.invoicing.list.invalidate();
    utils.invoicing.getById.invalidate();
  };

  // When settlement changes, invalidate related queries
  const invalidateSettlementDependents = () => {
    // Invalidate wallet data
    utils.wallet.getBalance.invalidate();
    utils.wallet.getSummary.invalidate();
    utils.wallet.getTransactions.invalidate();
    
    // Invalidate invoicing
    utils.invoicing.list.invalidate();
    utils.invoicing.getById.invalidate();
    
    // Invalidate financial dashboard
    utils.financialExtended.getFinancialAlerts.invalidate();
  };

  // When invoicing changes, invalidate related queries
  const invalidateInvoicingDependents = () => {
    // Invalidate wallet data
    utils.wallet.getBalance.invalidate();
    utils.wallet.getSummary.invalidate();
    
    // Invalidate settlement data
    utils.settlement.list.invalidate();
    utils.settlement.getById.invalidate();
    
    // Invalidate financial dashboard
    utils.financialExtended.getFinancialAlerts.invalidate();
    utils.financial.getProfitPerLoad.invalidate();
  };

  return {
    invalidateWalletDependents,
    invalidateSettlementDependents,
    invalidateInvoicingDependents,
  };
}
