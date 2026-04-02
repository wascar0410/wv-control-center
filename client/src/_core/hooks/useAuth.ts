import { useCallback } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      console.log("logout not available");
    }
  }, []);

  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    refresh: async () => ({ data: null }),
    logout,
  };
}
