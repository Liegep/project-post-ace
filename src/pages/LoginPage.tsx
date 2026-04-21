import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, ArrowLeft, Mail } from "lucide-react";
import { useAppLogo } from "@/hooks/useAppLogo";


const LoginPage = () => {
  const appLogo = useAppLogo();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [successMessage, setSuccessMessage] = useState("");
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setError("E-mail ou senha inválidos");
        return;
      }

      const userId = data.user.id;
      const [{ data: isAdmin }, { data: isTeamMember }, { data: isClient }] = await Promise.all([
        supabase.rpc("has_role" as any, {
          _user_id: userId,
          _role: "admin",
        }),
        supabase.rpc("has_role" as any, {
          _user_id: userId,
          _role: "team_member",
        }),
        supabase.rpc("has_role" as any, {
          _user_id: userId,
          _role: "client",
        }),
      ]);

      if (isAdmin) {
        navigate("/", { replace: true });
        return;
      }

      if (isTeamMember) {
        navigate("/team", { replace: true });
        return;
      }

      if (isClient) {
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
            navigate(`/client/${clientData.slug}`, { replace: true });
            return;
          }
        }

        setError("Nenhum cliente vinculado à sua conta");
        await supabase.auth.signOut();
        return;
      }

      setError("Seu usuário não tem acesso liberado");
      await supabase.auth.signOut();
    } catch {
      setError("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError("Erro ao enviar e-mail de recuperação");
        return;
      }

      setSuccessMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch {
      setError("Erro ao enviar e-mail de recuperação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Login content — fades in */}
      <div
        className={`w-full max-w-sm space-y-6 transition-all duration-700 ${
          animDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="text-center">
          {appLogo && (
            <img
              src={appLogo}
              alt="Logo"
              className={`h-14 w-14 rounded-xl object-contain mx-auto mb-3 transition-all duration-500 delay-200 ${
                animDone ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
            />
          )}
          <h1
            className={`text-2xl font-bold text-foreground transition-all duration-500 delay-300 ${
              animDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Design Hub
          </h1>
          <p
            className={`text-sm text-muted-foreground mt-1 transition-all duration-500 delay-400 ${
              animDone ? "opacity-100" : "opacity-0"
            }`}
          >
            {mode === "login"
              ? "Faça login para acessar o painel"
              : "Recupere sua senha"}
          </p>
        </div>

        {mode === "login" ? (
          <form
            onSubmit={handleLogin}
            className={`space-y-4 rounded-xl border bg-card p-6 transition-all duration-500 delay-500 ${
              animDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(""); setSuccessMessage(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleForgotPassword}
            className={`space-y-4 rounded-xl border bg-card p-6 transition-all duration-500 delay-500 ${
              animDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccessMessage(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar para login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
