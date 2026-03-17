import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async (userId: string) => {
      // Check admin role via has_role RPC
      const { data } = await supabase.rpc("has_role" as any, {
        _user_id: userId,
        _role: "admin",
      });
      if (data) {
        setAuthorized(true);
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

    // Initial check
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
