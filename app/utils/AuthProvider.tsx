"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStoredAuthUser, type AuthUser } from "@/utils/auth";

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getStoredAuthUser());

    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const signIn = useCallback((authenticatedUser: AuthUser) => {
    window.localStorage.setItem(
      "attendly_user",
      JSON.stringify(authenticatedUser)
    );
    setUser(authenticatedUser);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem("attendly_user");
    window.localStorage.removeItem("attendly_user_profile");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
