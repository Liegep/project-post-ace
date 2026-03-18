import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "team_member" | "client")[];
}

const AuthGuard = ({ children, allowedRoles = ["admin", "team_member"] }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async (userId: string) => {
      for (const role of allowedRoles) {
        const { data } = await supabase.rpc("has_role" as any, {
          _user_id: userId,
          _role: role,
        });
        if (data) {
          setAuthorized(true);
          setChecking(false);
          return;
        }
      }
      // Redirect to appropriate dashboard based on role
      const { data: isTeam } = await supabase.rpc("has_role" as any, {
        _user_id: userId,
        _role: "team_member",
      });
      if (isTeam) {
        navigate("/team");
        return;
      }

      const { data: isClientUser } = await supabase.rpc("has_role" as any, {
        _user_id: userId,
        _role: "client",
      });
      if (isClientUser) {
        // Redirect client to their own page
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
        navigate("/login");
      } else {
        navigate("/login");
      }
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
