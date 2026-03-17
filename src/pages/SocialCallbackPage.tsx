import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SocialCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Autorização negada pelo usuário.");
      setTimeout(() => navigate("/social"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não encontrado.");
      setTimeout(() => navigate("/social"), 3000);
      return;
    }

    const clientId = localStorage.getItem("meta_oauth_client_id");
    if (!clientId) {
      setStatus("error");
      setMessage("Cliente não identificado. Tente novamente.");
      setTimeout(() => navigate("/social"), 3000);
      return;
    }

    const exchangeToken = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const redirectUri = `${window.location.origin}/social/callback`;
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/meta-auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "exchange_token",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage(`Conta conectada! ${data.pages_count} página(s) encontrada(s).`);
          toast({ title: "Meta conectada com sucesso!" });
          localStorage.removeItem("meta_oauth_client_id");
        } else {
          setStatus("error");
          setMessage(data.error || "Erro ao conectar.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Erro ao processar autorização.");
      }

      setTimeout(() => navigate("/social"), 3000);
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        {status === "loading" && (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-foreground font-medium">Conectando conta Meta...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-foreground font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="text-foreground font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}
