/**
 * PlaidOAuthReturn.tsx — OAuth redirect landing page for Plaid Link
 *
 * When a user connects an OAuth institution (Chase, BofA, etc.), Plaid
 * redirects them back to this URL after authorization. This page re-initializes
 * Plaid Link with the same link_token and the receivedRedirectUri so the flow
 * can complete automatically.
 *
 * Registered redirect URI in Plaid Dashboard:
 *   https://app.wvtransports.com/plaid-oauth-return
 */
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from "react-plaid-link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PlaidOAuthReturn() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "opening" | "success" | "error">("loading");
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // The redirect URI must match exactly what was used to create the link token
  const receivedRedirectUri = window.location.href;
  const redirectUri = `${window.location.origin}/plaid-oauth-return`;

  const createLinkTokenMutation = trpc.plaid.createLinkToken.useMutation();

  const exchangeToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("Cuenta bancaria vinculada exitosamente");
      setTimeout(() => navigate("/finance"), 2000);
    },
    onError: (err) => {
      setStatus("error");
      toast.error(`Error al vincular: ${err.message}`);
    },
  });

  const onSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken) => {
      await exchangeToken.mutateAsync({ publicToken });
    },
    [exchangeToken]
  );

  const onExit: PlaidLinkOnExit = useCallback((err) => {
    if (err) {
      setStatus("error");
      toast.error(`Plaid: ${err.display_message || err.error_message || "Error desconocido"}`);
    } else {
      navigate("/finance");
    }
  }, [navigate]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess,
    onExit,
  });

  // Fetch a fresh link token on mount
  useEffect(() => {
    createLinkTokenMutation.mutateAsync({ redirectUri }).then((result) => {
      if (result?.linkToken) {
        setLinkToken(result.linkToken);
        setStatus("opening");
      } else {
        setStatus("error");
      }
    }).catch(() => {
      setStatus("error");
    });
  }, [createLinkTokenMutation, redirectUri]);

  // Auto-open Link once token + SDK are ready
  useEffect(() => {
    if (linkToken && ready && status === "opening") {
      open();
    }
  }, [linkToken, ready, status, open]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4 p-8 max-w-sm">
        {status === "loading" || status === "opening" ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
            <h2 className="text-white text-xl font-semibold">Completando vinculación...</h2>
            <p className="text-slate-400 text-sm">
              Plaid está finalizando la conexión con tu banco. Por favor espera.
            </p>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
            <h2 className="text-white text-xl font-semibold">¡Cuenta vinculada!</h2>
            <p className="text-slate-400 text-sm">
              Tu cuenta bancaria fue conectada exitosamente. Redirigiendo al panel financiero...
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-400" />
            <h2 className="text-white text-xl font-semibold">Error al vincular</h2>
            <p className="text-slate-400 text-sm">
              Hubo un problema al completar la vinculación. Por favor intenta de nuevo desde el
              panel financiero.
            </p>
            <button
              onClick={() => navigate("/finance")}
              className="text-blue-400 text-sm underline hover:text-blue-300"
            >
              Volver al panel financiero
            </button>
          </>
        )}
      </div>
    </div>
  );
}
