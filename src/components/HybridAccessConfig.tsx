import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Link2, Shield, Globe } from "lucide-react";
import { toast } from "sonner";

interface HybridAccessConfigProps {
  clientId: string;
}

export const HybridAccessConfig = ({ clientId }: HybridAccessConfigProps) => {
  const [requireLogin, setRequireLogin] = useState(true);
  const [allowQuickAccess, setAllowQuickAccess] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [clientId]);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("clients")
      .select("require_login, allow_quick_access, link_expiration_days")
      .eq("id", clientId)
      .maybeSingle();

    if (data) {
      setRequireLogin((data as any).require_login ?? true);
      setAllowQuickAccess((data as any).allow_quick_access ?? false);
      setExpirationDays((data as any).link_expiration_days ?? 7);
    }
    setLoading(false);
  };

  const updateConfig = async (field: string, value: any) => {
    const { error } = await supabase
      .from("clients")
      .update({ [field]: value })
      .eq("id", clientId);

    if (error) {
      toast.error("Erro ao salvar configuração.");
    } else {
      toast.success("Configuração salva!");
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Acesso do Cliente</h3>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <Label className="text-sm font-medium">Exigir login</Label>
              <p className="text-xs text-muted-foreground">Cliente precisa de login para acessar o sistema</p>
            </div>
          </div>
          <Switch
            checked={requireLogin}
            onCheckedChange={v => {
              setRequireLogin(v);
              updateConfig("require_login", v);
            }}
          />
        </div>

        <div className="border-t pt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <Label className="text-sm font-medium">Acesso rápido via link</Label>
              <p className="text-xs text-muted-foreground">Permitir aprovação sem login (apenas conteúdos públicos)</p>
            </div>
          </div>
          <Switch
            checked={allowQuickAccess}
            onCheckedChange={v => {
              setAllowQuickAccess(v);
              updateConfig("allow_quick_access", v);
            }}
          />
        </div>

        {allowQuickAccess && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Expiração dos links (dias)</Label>
            </div>
            <Input
              type="number"
              min={1}
              max={365}
              value={expirationDays}
              onChange={e => {
                const v = parseInt(e.target.value) || 7;
                setExpirationDays(v);
                updateConfig("link_expiration_days", v);
              }}
              className="w-32"
            />
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground font-medium mb-2">Classificação de conteúdo:</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">🔓 Posts</Badge>
            <Badge variant="secondary" className="text-[10px]">🔓 Legendas</Badge>
            <Badge variant="secondary" className="text-[10px]">🔓 Artes</Badge>
            <Badge variant="secondary" className="text-[10px]">🔓 Pautas</Badge>
            <Badge variant="destructive" className="text-[10px]">🔒 Faturas</Badge>
            <Badge variant="destructive" className="text-[10px]">🔒 Relatórios</Badge>
            <Badge variant="destructive" className="text-[10px]">🔒 Configurações</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
