import { describe, it, expect } from "vitest";
import * as bcrypt from "bcryptjs";

describe("Password Validation", () => {
  it("should hash password correctly", async () => {
    const password = "TestPassword123!";
    const hash = await bcrypt.hash(password, 10);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should verify correct password", async () => {
    const password = "TestPassword123!";
    const hash = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hash);
    
    expect(isMatch).toBe(true);
  });

  it("should not verify incorrect password", async () => {
    const password = "TestPassword123!";
    const wrongPassword = "WrongPassword123!";
    const hash = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(wrongPassword, hash);
    
    expect(isMatch).toBe(false);
  });

  it("should validate password requirements", () => {
    const validPasswords = [
      "SecurePass123!",
      "MyPassword@2024",
      "Test#Pass1234",
    ];
    
    const invalidPasswords = [
      "short",
      "nouppercase123!",
      "NOLOWERCASE123!",
      "NoNumbers!",
      "NoSpecialChar123",
    ];

    const validatePassword = (pwd: string): boolean => {
      const hasMinLength = pwd.length >= 8;
      const hasUppercase = /[A-Z]/.test(pwd);
      const hasLowercase = /[a-z]/.test(pwd);
      const hasNumbers = /\d/.test(pwd);
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
      
      return hasMinLength && hasUppercase && hasLowercase && hasNumbers && hasSpecialChars;
    };

    validPasswords.forEach((pwd) => {
      expect(validatePassword(pwd)).toBe(true);
    });

    invalidPasswords.forEach((pwd) => {
      expect(validatePassword(pwd)).toBe(false);
    });
  });

  it("should calculate password strength correctly", () => {
    const calculateStrength = (pwd: string): number => {
      let score = 0;

      if (pwd.length >= 8) score += 20;
      if (pwd.length >= 12) score += 10;
      if (pwd.length >= 16) score += 10;

      if (/[A-Z]/.test(pwd)) score += 15;
      if (/[a-z]/.test(pwd)) score += 15;
      if (/\d/.test(pwd)) score += 15;
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 15;

      return score;
    };

    expect(calculateStrength("weak")).toBeLessThan(40);
    expect(calculateStrength("Medium123")).toBeGreaterThanOrEqual(40);
    expect(calculateStrength("VeryStrong123!@#")).toBeGreaterThanOrEqual(80);
  });
});
