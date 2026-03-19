import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "super_admin" | "admin" | "colaborador" | "client" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);

      // Check roles in priority order
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userRoles = (roles || []).map((r: any) => r.role as string);

      if (userRoles.includes("super_admin")) {
        setRole("super_admin");
      } else if (userRoles.includes("admin")) {
        setRole("admin");
      } else if (userRoles.includes("colaborador")) {
        setRole("colaborador");
      } else if (userRoles.includes("client")) {
        setRole("client");
      }
      setLoading(false);
    };
    check();
  }, []);

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";
  const isColaborador = role === "colaborador";
  const isClient = role === "client";

  return { role, userId, loading, isSuperAdmin, isAdmin, isColaborador, isClient };
}
