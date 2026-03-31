import { useCallback } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const DEMO_USER = {
  id: "demo-owner",
  name: "WV Admin 2",
  email: "info@wvtransports.com",
  role: "owner",
};

export function useAuth(_options?: UseAuthOptions) {
  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      console.log("logout disabled in demo mode");
    }
  }, []);

  return {
    user: DEMO_USER,
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: async () => ({ data: DEMO_USER }),
    logout,
  };
}
