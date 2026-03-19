import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("super_admin" | "admin" | "colaborador" | "client")[];
}

const AuthGuard = ({ children, allowedRoles = ["super_admin", "admin"] }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async (userId: string) => {
      // Get user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userRoles = (roles || []).map((r: any) => r.role as string);

      // super_admin inherits admin and colaborador access
      const effectiveRoles = new Set(userRoles);
      if (effectiveRoles.has("super_admin")) {
        effectiveRoles.add("admin");
        effectiveRoles.add("colaborador");
      }
      if (effectiveRoles.has("admin")) {
        effectiveRoles.add("colaborador");
      }

      // Check if any allowed role matches
      const hasAccess = allowedRoles.some(r => effectiveRoles.has(r));
      
      if (hasAccess) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Redirect based on actual role
      if (effectiveRoles.has("admin") || effectiveRoles.has("super_admin")) {
        navigate("/admin");
        return;
      }

      if (effectiveRoles.has("colaborador")) {
        navigate("/admin");
        return;
      }

      if (effectiveRoles.has("client")) {
        const { data: assignments } = await supabase
          .from("user_client_assignments")
          .select("client_id")
          .eq("user_id", userId)
          .limit(1);
        if (assignments && assignments.length > 0) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("slug")
            .eq("id", assignments[0].client_id)
            .single();
          if (clientData) {
            navigate(`/client/${clientData.slug}`);
            return;
          }
        }
      }

      navigate("/login");
      setChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setChecking(false);
          navigate("/login");
        } else {
          checkAuth(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setChecking(false);
        navigate("/login");
      } else {
        checkAuth(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
};

export default AuthGuard;
