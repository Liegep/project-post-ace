import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Trash2, KeyRound, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientUser {
  id: string;
  full_name: string;
  email: string;
}

interface ClientAccessPanelProps {
  clientId: string;
  clientName: string;
}

const ClientAccessPanel = ({ clientId, clientName }: ClientAccessPanelProps) => {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClientUsers();
  }, [clientId]);

  const fetchClientUsers = async () => {
    setLoading(true);
    // Get assignments for this client
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("user_id")
      .eq("client_id", clientId);

    if (!assignments || assignments.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = assignments.map(a => a.user_id);

    // Get only users with client role
    const { data: clientRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "client")
      .in("user_id", userIds);

    if (!clientRoles || clientRoles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const clientUserIds = clientRoles.map(r => r.user_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientUserIds);

    setUsers((profiles as ClientUser[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client-user", {
        body: {
          email: formEmail,
          password: formPassword,
          full_name: formName,
          client_id: clientId,
        },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Erro ao criar acesso", variant: "destructive" });
        return;
      }
      toast({ title: "Acesso criado", description: `Login criado para ${formName}` });
      setCreateOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      fetchClientUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: ClientUser) => {
    if (!confirm(`Remover o acesso de ${user.full_name}?`)) return;
    try {
      const { error } = await supabase.functions.invoke("delete-auth-user", {
        body: { user_id: user.id },
      });
      if (error) {
        toast({ title: "Erro", description: "Erro ao remover acesso", variant: "destructive" });
        return;
      }
      toast({ title: "Acesso removido" });
      fetchClientUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Acesso do Cliente</h3>
          <p className="text-xs text-muted-foreground">Usuários que podem acessar o portal de {clientName}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Criar acesso
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum acesso criado</p>
          <p className="text-xs text-muted-foreground">Crie um login para o cliente acessar o portal de aprovação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Client Access Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Criar acesso para o cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crie um login para que o cliente acesse o portal de aprovação de <strong>{clientName}</strong>.
            </p>
            <div>
              <Label>Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome do responsável" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button onClick={handleCreate} disabled={saving || !formName || !formEmail || !formPassword} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Criando..." : "Criar acesso"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientAccessPanel;
