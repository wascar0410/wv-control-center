import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type WithdrawalMethod = "bank_transfer" | "check" | "paypal" | "venmo" | "other";

interface WithdrawalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  availableBalance: number;
}

const MIN_WITHDRAWAL = 50;

const METHOD_LABELS: Record<WithdrawalMethod, string> = {
  bank_transfer: "Transferencia Bancaria",
  check: "Cheque",
  paypal: "PayPal",
  venmo: "Venmo",
  other: "Otro",
};

export default function WithdrawalRequestModal({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
}: WithdrawalRequestModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod>("bank_transfer");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const requestWithdrawalMutation = trpc.wallet.requestWithdrawal.useMutation();

  const { data: linkedAccounts = [], isLoading: loadingAccounts } =
    trpc.plaid.getBankAccounts.useQuery(undefined, {
      enabled: isOpen,
      retry: 1,
      refetchOnWindowFocus: false,
    });

  const isSubmitting = requestWithdrawalMutation.isPending;
  const isBalanceInsufficient = availableBalance <= 0;
  const isBankTransfer = method === "bank_transfer";

  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);

  const amountError = useMemo(() => {
    if (!amount) return "";
    if (amountNum <= 0) return "Ingresa un monto válido";
    if (amountNum < MIN_WITHDRAWAL) {
      return `El monto mínimo de retiro es ${formatCurrency(MIN_WITHDRAWAL)}`;
    }
    if (amountNum > availableBalance) {
      return `Tu saldo disponible es ${formatCurrency(availableBalance)}`;
    }
    return "";
  }, [amount, amountNum, availableBalance]);

  const bankAccountError = useMemo(() => {
    if (!isBankTransfer) return "";
    if (!amount) return "";
    if (!bankAccountId.trim()) {
      return "Debes seleccionar una cuenta bancaria para transferencia";
    }
    return "";
  }, [isBankTransfer, amount, bankAccountId]);

  const canSubmit =
    !isSubmitting &&
    !isBalanceInsufficient &&
    !!amount &&
    amountNum >= MIN_WITHDRAWAL &&
    amountNum <= availableBalance &&
    (!isBankTransfer || !!bankAccountId.trim());

  const resetForm = useCallback(() => {
    setAmount("");
    setMethod("bank_transfer");
    setBankAccountId("");
    setNotes("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (isOpen && linkedAccounts.length === 1 && !bankAccountId) {
      setBankAccountId(String(linkedAccounts[0].id));
    }
  }, [isOpen, linkedAccounts, bankAccountId]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amountNum <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido",
        variant: "destructive",
      });
      return;
    }

    if (isBalanceInsufficient) {
      toast({
        title: "Sin balance disponible",
        description: "No tienes balance disponible para retirar",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `Tu saldo disponible es ${formatCurrency(availableBalance)}`,
        variant: "destructive",
      });
      return;
    }

    if (amountNum < MIN_WITHDRAWAL) {
      toast({
        title: "Monto mínimo",
        description: `El monto mínimo de retiro es ${formatCurrency(MIN_WITHDRAWAL)}`,
        variant: "destructive",
      });
      return;
    }

    if (isBankTransfer && !bankAccountId.trim()) {
      toast({
        title: "Cuenta bancaria requerida",
        description: "Debes seleccionar una cuenta bancaria para transferencia",
        variant: "destructive",
      });
      return;
    }

    try {
      await requestWithdrawalMutation.mutateAsync({
        amount: amountNum,
        method,
        bankAccountId: bankAccountId.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      await Promise.all([
        utils.wallet.getWalletSummary.invalidate(),
        utils.wallet.getStats.invalidate(),
        utils.wallet.getTransactions.invalidate(),
        utils.wallet.getWithdrawals.invalidate(),
      ]);

      toast({
        title: "Éxito",
        description: "Tu solicitud de retiro ha sido registrada",
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo procesar la solicitud",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Retiro</DialogTitle>
          <DialogDescription>
            Saldo disponible:{" "}
            <span
              className={`font-bold ${
                isBalanceInsufficient ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatCurrency(availableBalance)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isBalanceInsufficient && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
            <p className="font-medium">No tienes balance disponible para retirar</p>
            <p className="text-xs mt-1 opacity-90">
              Completa más cargas o espera a que se acrediten fondos a tu wallet
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Retirar</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={MIN_WITHDRAWAL}
                max={availableBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                disabled={isSubmitting || isBalanceInsufficient}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo: {formatCurrency(MIN_WITHDRAWAL)} | Máximo: {formatCurrency(availableBalance)}
            </p>
            {amountError && <p className="text-xs text-destructive">{amountError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método de Retiro</Label>
            <Select
              value={method}
              onValueChange={(val: WithdrawalMethod) => setMethod(val)}
              disabled={isSubmitting || isBalanceInsufficient}
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isBankTransfer && (
            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Cuenta Bancaria</Label>
              <Select
                value={bankAccountId}
                onValueChange={setBankAccountId}
                disabled={isSubmitting || isBalanceInsufficient || loadingAccounts}
              >
                <SelectTrigger id="bankAccountId">
                  <SelectValue
                    placeholder={
                      loadingAccounts
                        ? "Cargando cuentas..."
                        : linkedAccounts.length > 0
                          ? "Selecciona una cuenta"
                          : "No hay cuentas conectadas"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {linkedAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} {account.mask ? `••••${account.mask}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {linkedAccounts.length === 0 && !loadingAccounts && (
                <p className="text-xs text-muted-foreground">
                  No tienes cuentas bancarias conectadas. Conecta una cuenta antes de usar transferencia bancaria.
                </p>
              )}

              {bankAccountError && (
                <p className="text-xs text-destructive">{bankAccountError}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Input
              id="notes"
              placeholder="Agrega cualquier nota adicional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting || isBalanceInsufficient}
            />
          </div>

          {amount && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monto solicitado:</span>
                <span className="font-medium">{formatCurrency(amountNum)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Método:</span>
                <span className="font-medium">{METHOD_LABELS[method]}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Total a Retirar:</span>
                <span className="font-bold">{formatCurrency(amountNum)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              title={isBalanceInsufficient ? "No tienes balance disponible" : ""}
            >
              {isSubmitting ? "Procesando..." : "Solicitar Retiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
