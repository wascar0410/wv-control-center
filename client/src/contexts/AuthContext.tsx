import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type AuthUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  profileImageUrl?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  authChecked: boolean; // True when initial auth query has completed (success or failure)
  isOwner: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authChecked: false,
  isOwner: false,
  isAdmin: false,
  isDriver: false,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [refetchKey, setRefetchKey] = useState(0);

  const { data: user, isLoading, status } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60, // 1 minute - reduce stale time to catch role changes faster
    refetchOnWindowFocus: true, // refetch when window regains focus
    refetchInterval: 1000 * 60 * 2, // refetch every 2 minutes as fallback
  });

  const refetch = () => setRefetchKey((k) => k + 1);

  const authUser = user as AuthUser | null | undefined;
  // authChecked is true when the initial query has completed (success or error)
  const authChecked = status !== "pending";

  return (
    <AuthContext.Provider
      value={{
        user: authUser ?? null,
        loading: isLoading,
        authChecked,
        isOwner: authUser?.role === "owner",
        isAdmin: authUser?.role === "admin" || authUser?.role === "owner",
        isDriver: authUser?.role === "driver",
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
