import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LinkIcon } from "lucide-react";

export function PlaidLinkButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handlePlaidLink = async () => {
    setIsLoading(true);
    try {
      // In production, this would open Plaid Link modal
      // For now, we'll show a placeholder
      const response = await fetch("/api/trpc/finance.initiatePlaidLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Error al iniciar Plaid Link");
      }

      toast.success("Plaid Link iniciado. Por favor completa la vinculación.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al conectar Plaid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePlaidLink}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <LinkIcon className="w-4 h-4" />
      {isLoading ? "Conectando..." : "Vincular Cuenta Bancaria"}
    </Button>
  );
}
