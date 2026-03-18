import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "team_member" | null;

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

      const { data: isAdmin } = await supabase.rpc("has_role" as any, {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (isAdmin) {
        setRole("admin");
        setLoading(false);
        return;
      }

      const { data: isTeam } = await supabase.rpc("has_role" as any, {
        _user_id: session.user.id,
        _role: "team_member",
      });
      if (isTeam) {
        setRole("team_member");
      }
      setLoading(false);
    };
    check();
  }, []);

  return { role, userId, loading };
}
