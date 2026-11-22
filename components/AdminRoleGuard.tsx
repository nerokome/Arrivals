"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUserPrivileges } from "@/utils/userPrivileges";

export default function AdminRoleGuard({ children }: { children: ReactNode }) {
  const { user } = useUserPrivileges();
  const router = useRouter();
  const isAgent = user?.role?.toUpperCase() === "AGENT";

  useEffect(() => {
    if (isAgent) router.replace("/dashboard");
  }, [isAgent, router]);

  if (!user || isAgent) return null;
  return children;
}
