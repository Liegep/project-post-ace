import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

interface InternalApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
  clientId: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
}

export function InternalApprovalDialog({ open, onOpenChange, postId, postTitle, clientId }: InternalApprovalDialogProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setMessage("");
    loadMembers();
  }, [open, clientId]);

  const loadMembers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all internal users (admin, team_member, colaborador, super_admin)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "team_member", "colaborador", "super_admin"]);

    if (!roles || roles.length === 0) { setLoading(false); return; }

    const userIds = [...new Set(roles.map(r => r.user_id).filter(id => id !== user.id))];
    if (userIds.length === 0) { setMembers([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);

    setMembers((profiles || []) as TeamMember[]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const rows = selected.map(uid => ({
      post_id: postId,
      client_id: clientId,
      requested_by: user.id,
      assigned_to: uid,
      status: "pending",
      comment: message,
    }));

    const { error } = await supabase.from("internal_approvals" as any).insert(rows);

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      // Create notifications for each assigned user
      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
      const notifs = selected.map(uid => ({
        user_id: uid,
        client_id: clientId,
        post_id: postId,
        type: "internal_approval",
        title: "Aprovação interna solicitada",
        message: `${profile?.full_name || "Usuário"} enviou "${postTitle}" para sua aprovação.`,
        actor_avatar_url: profile?.avatar_url || "",
      }));
      await supabase.from("admin_notifications").insert(notifs);

      toast({ title: "Enviado para aprovação!", description: `Post enviado para ${selected.length} usuário(s).` });
      onOpenChange(false);
    }
    setSending(false);
  };

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Enviar para Aprovação Interna
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-2">
          Selecione os membros da equipe que devem revisar <strong className="text-foreground">"{postTitle}"</strong>
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro disponível</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {members.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
              >
                <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                <Avatar className="h-7 w-7">
                  <AvatarImage src={m.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {(m.full_name || m.email || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.full_name || m.email}</p>
                  {m.full_name && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
                </div>
              </label>
            ))}
          </div>
        )}

        <Textarea
          placeholder="Mensagem opcional para os revisores..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="mt-2"
          rows={2}
        />

        <Button onClick={handleSend} disabled={selected.length === 0 || sending} className="w-full mt-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Enviar para {selected.length || ""} {selected.length === 1 ? "pessoa" : "pessoas"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
