import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface EmailValidationState {
  email: string;
  isValid: boolean;
  isAvailable: boolean | null;
  isChecking: boolean;
  error: string | null;
}

/**
 * Hook para validar disponibilidad de email en tiempo real
 * Incluye debounce para evitar demasiadas consultas al servidor
 */
export function useEmailValidation(debounceMs: number = 500): EmailValidationState & {
  setEmail: (email: string) => void;
} {
  const [email, setEmailState] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const checkEmailQuery = trpc.admin.checkEmailAvailability.useQuery(
    { email },
    {
      enabled: false,
      retry: false,
    }
  );

  // Validar formato de email
  const validateEmailFormat = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  // Manejar cambio de email con debounce
  const handleEmailChange = useCallback(
    (newEmail: string) => {
      setEmailState(newEmail);
      setError(null);

      // Limpiar timer anterior
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Validar formato
      if (newEmail.length === 0) {
        setIsValid(false);
        setIsAvailable(null);
        return;
      }

      const isValidFormat = validateEmailFormat(newEmail);
      setIsValid(isValidFormat);

      if (!isValidFormat) {
        setIsAvailable(null);
        setError("Formato de email inválido");
        return;
      }

      // Configurar nuevo timer para debounce
      const timer = setTimeout(async () => {
        try {
          const result = await checkEmailQuery.refetch();
          if (result.data) {
            setIsAvailable(result.data.available);
            if (!result.data.available) {
              setError("Este email ya está registrado");
            }
          }
        } catch (err) {
          setError("Error al verificar email");
          console.error("Email validation error:", err);
        }
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [debounceTimer, debounceMs, validateEmailFormat, checkEmailQuery]
  );

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    email,
    isValid,
    isAvailable,
    isChecking: checkEmailQuery.isLoading,
    error,
    setEmail: handleEmailChange,
  };
}
