import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Copy, Check, Clock, Mail } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
}

interface InviteAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteAdminDialog = ({ open, onOpenChange }: InviteAdminDialogProps) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchInvitations();
  }, [open]);

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    setInvitations((data as Invitation[]) || []);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-admin-invite",
        { body: { email } }
      );

      if (error || data?.error) {
        toast({
          title: "Erro ao enviar convite",
          description: data?.error || "Tente novamente",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Convite criado!", description: `Convite para ${email} criado com sucesso.` });
      setEmail("");
      fetchInvitations();
    } catch {
      toast({ title: "Erro", description: "Erro ao criar convite", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Administrador
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInvite} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <Button type="submit" disabled={sending} size="sm">
            <Mail className="mr-1 h-4 w-4" />
            {sending ? "..." : "Convidar"}
          </Button>
        </form>

        {invitations.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-foreground">Convites</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {inv.accepted_at ? (
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <Check className="h-3 w-3" /> Aceito
                    </span>
                  ) : new Date(inv.expires_at) < new Date() ? (
                    <span className="text-xs text-muted-foreground">Expirado</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1 text-xs text-warning font-medium">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        className="rounded p-1 hover:bg-background"
                        title="Copiar link"
                      >
                        {copiedToken === inv.token ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteAdminDialog;
