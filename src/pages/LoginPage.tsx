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
  const [phase, setPhase] = useState<"enter" | "paint" | "fadeout" | "done">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("paint"), 200);
    const t2 = setTimeout(() => setPhase("fadeout"), 2400);
    const t3 = setTimeout(() => { setPhase("done"); onComplete(); }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden bg-background">
      {/* Full-screen colored paint wash behind brush */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${PAINT_COLORS[0]}22, ${PAINT_COLORS[4]}22, ${PAINT_COLORS[8]}22, ${PAINT_COLORS[12]}22)`,
          opacity: phase === "fadeout" ? 0 : 1,
          transition: "opacity 0.8s ease-out",
        }}
      />

      {/* Paint trail strokes — thick, organic, overlapping */}
      <div
        style={{
          opacity: phase === "fadeout" ? 0 : 1,
          transition: "opacity 0.8s ease-out",
        }}
      >
        {PAINT_COLORS.map((color, i) => {
          const yCenter = 50;
          const spread = 42;
          const y = yCenter + (i - PAINT_COLORS.length / 2) * (spread * 2 / PAINT_COLORS.length);
          const height = 6 + Math.sin(i * 0.8) * 3;
          const delay = 0.3 + i * 0.04;
          const skew = -3 + (i % 3) * 3;
          return (
            <div
              key={`stroke-${i}`}
              className="absolute"
              style={{
                top: `${y}%`,
                left: 0,
                width: "100%",
                height: `${height}%`,
                background: `linear-gradient(90deg, ${color}00 0%, ${color}cc 8%, ${color} 20%, ${color}ee 45%, ${color}88 65%, ${color}33 80%, ${color}00 100%)`,
                transform: `skewY(${skew}deg)`,
                borderRadius: "40% 60% 50% 40%",
                animation: phase !== "enter"
                  ? `paintSweep 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s both`
                  : "none",
                filter: `blur(${i % 3 === 0 ? 1 : 0}px)`,
              }}
            />
          );
        })}

        {/* Extra thick accent strokes for depth */}
        {[0, 3, 7, 11, 14].map((idx) => {
          const color = PAINT_COLORS[idx];
          const y = 25 + idx * 3.5;
          return (
            <div
              key={`thick-${idx}`}
              className="absolute"
              style={{
                top: `${y}%`,
                left: 0,
                width: "100%",
                height: "4%",
                background: `linear-gradient(90deg, ${color}00 0%, ${color} 15%, ${color}dd 40%, ${color}66 60%, ${color}00 80%)`,
                borderRadius: "50%",
                animation: phase !== "enter"
                  ? `paintSweep 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${0.2 + idx * 0.05}s both`
                  : "none",
                filter: "blur(2px)",
                opacity: 0.7,
              }}
            />
          );
        })}

        {/* Paint splatter spots */}
        {Array.from({ length: 30 }).map((_, i) => {
          const color = PAINT_COLORS[i % PAINT_COLORS.length];
          const x = 5 + (i * 3.1) % 85;
          const y = 15 + (i * 5.7) % 70;
          const size = 6 + (i % 5) * 4;
          const delay = 0.6 + (i * 0.07);
          return (
            <div
              key={`splat-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: `radial-gradient(circle, ${color} 40%, ${color}88 100%)`,
                animation: phase !== "enter"
                  ? `splatPop 0.4s ease-out ${delay}s both`
                  : "none",
                boxShadow: `0 0 ${size}px ${color}66`,
              }}
            />
          );
        })}
      </div>

      {/* THE BIG BRUSH — illustrative, large, detailed */}
      <div
        className="absolute"
        style={{
          top: 0,
          width: 280,
          height: "100%",
          animation: phase !== "enter"
            ? "brushSweep 2s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both"
            : "none",
          zIndex: 10,
        }}
      >
        {/* Handle — long wooden stick going up-right diagonally */}
        <div
          className="absolute"
          style={{
            top: "10%",
            left: 120,
            width: 220,
            height: 22,
            borderRadius: 11,
            background: "linear-gradient(180deg, #DEB887 0%, #CD853F 30%, #8B6914 70%, #6B4E12 100%)",
            transform: "rotate(-52deg)",
            transformOrigin: "left center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* Wood grain lines */}
          <div className="absolute inset-0 rounded-full opacity-20"
            style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 9px)" }}
          />
        </div>

        {/* Ferrule — metal band */}
        <div
          className="absolute"
          style={{
            top: "42%",
            left: 68,
            width: 60,
            height: 32,
            borderRadius: 4,
            background: "linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 25%, #888 50%, #B8B8B8 75%, #D8D8D8 100%)",
            transform: "rotate(-2deg)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {/* Ferrule ring details */}
          <div className="absolute top-1 left-0 right-0 h-[2px] bg-white/20 rounded" />
          <div className="absolute bottom-1 left-0 right-0 h-[2px] bg-black/10 rounded" />
        </div>

        {/* Bristles — fat, paint-loaded tip */}
        <div
          className="absolute"
          style={{
            top: "35%",
            left: -10,
            width: 85,
            height: 80,
            borderRadius: "40px 12px 12px 40px",
            background: `conic-gradient(from 180deg, ${PAINT_COLORS[0]}, ${PAINT_COLORS[2]}, ${PAINT_COLORS[4]}, ${PAINT_COLORS[6]}, ${PAINT_COLORS[8]}, ${PAINT_COLORS[10]}, ${PAINT_COLORS[12]}, ${PAINT_COLORS[14]}, ${PAINT_COLORS[0]})`,
            boxShadow: `0 0 40px ${PAINT_COLORS[5]}88, 0 0 80px ${PAINT_COLORS[9]}44`,
            transform: "rotate(-2deg)",
          }}
        >
          {/* Bristle texture lines */}
          {Array.from({ length: 12 }).map((_, j) => (
            <div
              key={j}
              className="absolute"
              style={{
                top: 6 + j * 5.5,
                left: 5,
                right: 10,
                height: 1.5,
                background: `rgba(0,0,0,${0.05 + (j % 3) * 0.05})`,
                borderRadius: 2,
              }}
            />
          ))}
          {/* Wet paint gloss */}
          <div
            className="absolute rounded-full"
            style={{
              top: 8,
              left: 10,
              width: 35,
              height: 20,
              background: "rgba(255,255,255,0.2)",
              filter: "blur(6px)",
            }}
          />
        </div>

        {/* Paint drips falling from bristles */}
        {PAINT_COLORS.slice(0, 8).map((color, d) => (
          <div
            key={`drip-${d}`}
            className="absolute"
            style={{
              top: `${62 + d * 1.5}%`,
              left: 5 + d * 7,
              width: 5 + (d % 3) * 2,
              height: 14 + d * 4,
              borderRadius: "3px 3px 50% 50%",
              background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
              animation: phase !== "enter"
                ? `dripFall 1s ease-in ${0.8 + d * 0.12}s both`
                : "none",
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes paintSweep {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes brushSweep {
          0% { left: -300px; }
          55% { left: 45%; }
          100% { left: calc(100% + 300px); }
        }
        @keyframes splatPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        @keyframes dripFall {
          0% { transform: translateY(0); opacity: 1; }
          70% { opacity: 0.8; }
          100% { transform: translateY(60px); opacity: 0; }
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
