import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, ArrowLeft, Mail } from "lucide-react";
import { useAppLogo } from "@/hooks/useAppLogo";

const PAINT_COLORS = [
  "#FF3B6F", "#FF6B35", "#FFD23F", "#06D6A0", "#118AB2",
  "#7B2FF7", "#FF006E", "#3A86FF", "#FB5607", "#8338EC",
  "#06BEE1", "#FF5DA2", "#FFBE0B", "#00C9A7", "#845EC2",
];

const BrushAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"painting" | "fading">("painting");

  useEffect(() => {
    const paintTimer = setTimeout(() => setPhase("fading"), 1800);
    const completeTimer = setTimeout(() => onComplete(), 2800);
    return () => { clearTimeout(paintTimer); clearTimeout(completeTimer); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Paint strokes */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${phase === "fading" ? "opacity-0" : "opacity-100"}`}
      >
        {PAINT_COLORS.map((color, i) => {
          const y = 8 + (i / PAINT_COLORS.length) * 84;
          const height = 4 + Math.random() * 5;
          const delay = i * 0.06;
          const duration = 0.8 + Math.random() * 0.4;
          return (
            <div
              key={i}
              className="absolute left-0"
              style={{
                top: `${y}%`,
                height: `${height}%`,
                width: "100%",
                background: `linear-gradient(90deg, ${color}00 0%, ${color} 15%, ${color}dd 50%, ${color}88 75%, ${color}00 100%)`,
                animation: `paintStroke ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
              }}
            />
          );
        })}

        {/* Brush head */}
        <div
          className="absolute"
          style={{
            width: 60,
            height: "100%",
            top: 0,
            animation: "brushMove 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
          }}
        >
          {/* Brush handle */}
          <div
            className="absolute"
            style={{
              top: "38%",
              left: 10,
              width: 44,
              height: 12,
              borderRadius: 6,
              background: "linear-gradient(180deg, #C4956A 0%, #8B6914 100%)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              transform: "rotate(-2deg)",
            }}
          />
          {/* Brush ferrule */}
          <div
            className="absolute"
            style={{
              top: "37%",
              left: -2,
              width: 16,
              height: 14,
              borderRadius: "3px 0 0 3px",
              background: "linear-gradient(180deg, #D4D4D8 0%, #A1A1AA 100%)",
            }}
          />
          {/* Brush bristles with paint */}
          <div
            className="absolute"
            style={{
              top: "32%",
              left: -22,
              width: 24,
              height: 24,
              borderRadius: "8px 2px 2px 8px",
              background: `linear-gradient(135deg, ${PAINT_COLORS[0]}, ${PAINT_COLORS[4]}, ${PAINT_COLORS[8]}, ${PAINT_COLORS[12]})`,
              boxShadow: `0 0 20px ${PAINT_COLORS[5]}88`,
            }}
          />
          {/* Dripping paint */}
          {[0, 1, 2].map((d) => (
            <div
              key={d}
              className="absolute rounded-full"
              style={{
                top: `${55 + d * 6}%`,
                left: -18 + d * 6,
                width: 5,
                height: 8 + d * 3,
                background: PAINT_COLORS[(d * 4) % PAINT_COLORS.length],
                animation: `drip 0.6s ease-in ${0.8 + d * 0.15}s both`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Splash particles */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${phase === "fading" ? "opacity-0" : "opacity-100"}`}
      >
        {Array.from({ length: 20 }).map((_, i) => {
          const color = PAINT_COLORS[i % PAINT_COLORS.length];
          const x = 10 + Math.random() * 80;
          const y = 10 + Math.random() * 80;
          const size = 4 + Math.random() * 10;
          const delay = 0.3 + Math.random() * 1.2;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: color,
                animation: `splat 0.5s ease-out ${delay}s both`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes paintStroke {
          0% { transform: scaleX(0); transform-origin: left; }
          100% { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes brushMove {
          0% { left: -80px; }
          100% { left: calc(100% + 80px); }
        }
        @keyframes drip {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(30px); }
        }
        @keyframes splat {
          0% { transform: scale(0); opacity: 1; }
          60% { transform: scale(1.3); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

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
      {/* Brush animation overlay */}
      {!animDone && <BrushAnimation onComplete={() => setAnimDone(true)} />}

      {/* Login content — fades in after animation */}
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
              <Label htmlFor="password">Senha</Label>
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
