import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Facebook, Instagram, Link2, Unlink, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { MetaPage } from "@/hooks/useSocialPosts";
import { format } from "date-fns";

interface MetaConnectPanelProps {
  clientId: string;
  pages: MetaPage[];
  onRefresh: () => void;
}

export function MetaConnectPanel({ clientId, pages, onRefresh }: MetaConnectPanelProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
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
        body: JSON.stringify({ action: "get_auth_url", redirect_uri: redirectUri }),
      });

      const data = await res.json();
      if (data.auth_url) {
        // Store client_id for callback
        localStorage.setItem("meta_oauth_client_id", clientId);
        window.location.href = data.auth_url;
      } else {
        toast({ title: "Erro ao gerar link de autenticação", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao conectar", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Deseja desconectar esta conta? Posts já agendados podem falhar.")) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`https://${projectId}.supabase.co/functions/v1/meta-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action: "disconnect", account_id: accountId }),
    });
    toast({ title: "Conta desconectada" });
    onRefresh();
  };

  const handleRefreshToken = async (accountId: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/meta-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action: "refresh_token", account_id: accountId }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: "Token renovado com sucesso!" });
      onRefresh();
    } else {
      toast({ title: "Erro ao renovar token", description: data.error, variant: "destructive" });
    }
  };

  // Group pages by account
  const accounts = pages.reduce((acc, page) => {
    const key = page.meta_account_id;
    if (!acc[key]) acc[key] = { name: page.meta_accounts?.meta_user_name || "Conta Meta", expires: page.meta_accounts?.token_expires_at, pages: [] };
    acc[key].pages.push(page);
    return acc;
  }, {} as Record<string, { name: string; expires: string | null | undefined; pages: MetaPage[] }>);

  const isExpiringSoon = (expires: string | null | undefined) => {
    if (!expires) return false;
    return new Date(expires).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Contas Meta Conectadas</CardTitle>
          <Button onClick={handleConnect} disabled={connecting} size="sm">
            <Link2 className="mr-2 h-4 w-4" />
            {connecting ? "Conectando..." : "Conectar Meta"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(accounts).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conta conectada. Clique em "Conectar Meta" para começar.
          </p>
        ) : (
          Object.entries(accounts).map(([accountId, account]) => (
            <div key={accountId} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{account.name}</span>
                  {isExpiringSoon(account.expires) && (
                    <Badge variant="outline" className="text-warning-foreground bg-warning/20 gap-1">
                      <AlertTriangle className="h-3 w-3" /> Token expirando
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRefreshToken(accountId)} title="Renovar token">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDisconnect(accountId)} title="Desconectar">
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {account.pages.map((page) => (
                  <Badge key={page.id} variant="secondary" className="gap-1">
                    {page.platform === "instagram" ? (
                      <Instagram className="h-3 w-3 text-pink-500" />
                    ) : (
                      <Facebook className="h-3 w-3 text-blue-600" />
                    )}
                    {page.page_name}
                    {page.instagram_username && ` (@${page.instagram_username})`}
                  </Badge>
                ))}
              </div>
              {account.expires && (
                <p className="text-xs text-muted-foreground">
                  Token expira em: {format(new Date(account.expires), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
