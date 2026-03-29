import { useState, useCallback } from "react";

interface PasswordValidationState {
  password: string;
  confirmPassword: string;
  isValid: boolean;
  isMatching: boolean;
  strength: "weak" | "fair" | "good" | "strong";
  strengthScore: number;
  errors: string[];
}

interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const defaultRequirements: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Hook para validar contraseñas con confirmación
 * Incluye verificación de fortaleza y requisitos
 */
export function usePasswordValidation(
  requirements: PasswordRequirements = defaultRequirements
): PasswordValidationState & {
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  reset: () => void;
} {
  const [password, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPasswordState] = useState("");

  // Calcular fortaleza de contraseña
  const calculateStrength = useCallback((pwd: string): { score: number; strength: "weak" | "fair" | "good" | "strong" } => {
    let score = 0;

    if (pwd.length >= requirements.minLength) score += 20;
    if (pwd.length >= 12) score += 10;
    if (pwd.length >= 16) score += 10;

    if (requirements.requireUppercase && /[A-Z]/.test(pwd)) score += 15;
    if (requirements.requireLowercase && /[a-z]/.test(pwd)) score += 15;
    if (requirements.requireNumbers && /\d/.test(pwd)) score += 15;
    if (requirements.requireSpecialChars && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 15;

    let strength: "weak" | "fair" | "good" | "strong" = "weak";
    if (score >= 80) strength = "strong";
    else if (score >= 60) strength = "good";
    else if (score >= 40) strength = "fair";

    return { score, strength };
  }, [requirements]);

  // Validar requisitos de contraseña
  const validatePassword = useCallback((pwd: string): string[] => {
    const errors: string[] = [];

    if (pwd.length < requirements.minLength) {
      errors.push(`La contraseña debe tener al menos ${requirements.minLength} caracteres`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(pwd)) {
      errors.push("Debe contener al menos una letra mayúscula");
    }

    if (requirements.requireLowercase && !/[a-z]/.test(pwd)) {
      errors.push("Debe contener al menos una letra minúscula");
    }

    if (requirements.requireNumbers && !/\d/.test(pwd)) {
      errors.push("Debe contener al menos un número");
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      errors.push("Debe contener al menos un carácter especial (!@#$%^&* etc)");
    }

    return errors;
  }, [requirements]);

  // Manejar cambio de contraseña
  const handlePasswordChange = useCallback((newPassword: string) => {
    setPasswordState(newPassword);
  }, []);

  // Manejar cambio de confirmación
  const handleConfirmPasswordChange = useCallback((newConfirmPassword: string) => {
    setConfirmPasswordState(newConfirmPassword);
  }, []);

  // Resetear campos
  const handleReset = useCallback(() => {
    setPasswordState("");
    setConfirmPasswordState("");
  }, []);

  // Calcular validación
  const passwordErrors = validatePassword(password);
  const { score: strengthScore, strength } = calculateStrength(password);
  const isMatching = password === confirmPassword && password.length > 0;
  const isValid = passwordErrors.length === 0 && isMatching;

  return {
    password,
    confirmPassword,
    isValid,
    isMatching,
    strength,
    strengthScore,
    errors: passwordErrors,
    setPassword: handlePasswordChange,
    setConfirmPassword: handleConfirmPasswordChange,
    reset: handleReset,
  };
}
