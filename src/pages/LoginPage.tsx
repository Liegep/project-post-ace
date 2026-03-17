import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "bootstrap">("login");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("E-mail ou senha inválidos");
        return;
      }

      navigate("/");
    } catch {
      setError("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "bootstrap-admin",
        { body: { email, password } }
      );

      if (fnError || data?.error) {
        setError(data?.error || "Erro ao criar admin");
        return;
      }

      // Auto-login
      await supabase.auth.signInWithPassword({ email, password });
      navigate("/");
    } catch {
      setError("Erro ao criar admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">ContentFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Faça login para acessar o painel"
              : "Crie o primeiro administrador"}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleBootstrap}
          className="space-y-4 rounded-xl border bg-card p-6"
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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "bootstrap" ? "Mínimo 6 caracteres" : "••••••••"}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "login" ? (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Entrando..." : "Entrar"}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Criando..." : "Criar primeiro admin"}
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "bootstrap" : "login"); setError(""); }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login"
              ? "Primeiro acesso? Criar admin inicial"
              : "Já tem conta? Fazer login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
