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
  isOwner: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOwner: false,
  isAdmin: false,
  isDriver: false,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [refetchKey, setRefetchKey] = useState(0);

  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const refetch = () => setRefetchKey((k) => k + 1);

  const authUser = user as AuthUser | null | undefined;

  return (
    <AuthContext.Provider
      value={{
        user: authUser ?? null,
        loading: isLoading,
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
