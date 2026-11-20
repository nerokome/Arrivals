import { useAuth } from "@/app/utils/AuthProvider";

export function useUserPrivileges() {
  const { user: activeUser } = useAuth();
  const userType = activeUser?.role ?? null;
  const user = activeUser ?? null;

  const isSuperAdmin = userType === "SUPER_ADMIN";
  const isAdmin = userType?.toUpperCase() === "ADMIN"; 
  const isAgent = userType?.toUpperCase() === "AGENT";
  const token = activeUser?.token ?? null;

  return {
    isSuperAdmin,
    isAdmin, 
    isAgent,
    token,
    user
  };
}
