import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LinkBankAccountModal() {
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings" | "credit_card" | "other">("checking");
  const [accountLast4, setAccountLast4] = useState("");

  const linkAccount = trpc.bankTransaction.linkBankAccount.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName || !accountLast4 || accountLast4.length !== 4) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    try {
      await linkAccount.mutateAsync({
        bankName,
        accountType,
        accountLast4,
      });

      toast.success("Cuenta bancaria conectada exitosamente");
      utils.bankTransaction.getBankAccounts.invalidate();
      
      // Reset form
      setBankName("");
      setAccountType("checking");
      setAccountLast4("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Error al conectar cuenta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="w-4 h-4" />
          Conectar Banco
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Cuenta Bancaria</DialogTitle>
        </DialogHeader>

        <Alert className="bg-blue-500/10 border-blue-500/20">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-sm text-blue-300">
            Conecta tu cuenta bancaria para sincronizar transacciones automáticamente.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Nombre del Banco</Label>
            <Input
              id="bankName"
              placeholder="ej: Chase, Bank of America, etc."
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="accountType">Tipo de Cuenta</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as any)}>
              <SelectTrigger id="accountType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Cuenta Corriente</SelectItem>
                <SelectItem value="savings">Cuenta de Ahorros</SelectItem>
                <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Last 4 Digits */}
          <div className="space-y-2">
            <Label htmlFor="accountLast4">Últimos 4 Dígitos</Label>
            <Input
              id="accountLast4"
              placeholder="1234"
              maxLength={4}
              value={accountLast4}
              onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Solo se almacenan los últimos 4 dígitos por seguridad</p>
            <p>• Las transacciones se sincronizarán automáticamente</p>
          </div>

          {/* Submit */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={linkAccount.isPending}>
              {linkAccount.isPending ? "Conectando..." : "Conectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
