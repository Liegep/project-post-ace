import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Copy, Check, Clock, Mail, Shield, Users } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  token: string;
  role: string;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
}

interface Client {
  id: string;
  name: string;
}

interface InviteAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteAdminDialog = ({ open, onOpenChange }: InviteAdminDialogProps) => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "colaborador">("admin");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchInvitations();
      fetchClients();
    }
  }, [open]);

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    setInvitations((data as any[]) || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients((data as Client[]) || []);
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-admin-invite",
        {
          body: {
            email,
            role,
            client_ids: role === "team_member" ? Array.from(selectedClientIds) : [],
          },
        }
      );

      if (error || data?.error) {
        toast({
          title: t("inviteError"),
          description: data?.error || "",
          variant: "destructive",
        });
        return;
      }

      toast({ title: t("inviteCreated"), description: `${t("invite")} ${email}` });
      setEmail("");
      setRole("team_member");
      setSelectedClientIds(new Set());
      fetchInvitations();
    } catch {
      toast({ title: t("inviteError"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast({ title: t("linkCopied") });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("inviteMember")}
          </DialogTitle>
          <DialogDescription>{t("inviteMemberDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Role selector */}
          <div>
            <Label>{t("roleLabel")}</Label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setRole("team_member")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  role === "team_member"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Users className="h-4 w-4" />
                {t("teamMember")}
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  role === "admin"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            </div>
          </div>

          {/* Client assignment for team members */}
          {role === "team_member" && clients.length > 0 && (
            <div>
              <Label>{t("assignClients")}</Label>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-2 rounded-lg border p-3">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedClientIds.has(c.id)}
                      onCheckedChange={() => toggleClient(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" disabled={sending} className="w-full">
            <Mail className="mr-2 h-4 w-4" />
            {sending ? "..." : t("sendInvite")}
          </Button>
        </form>

        {invitations.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-foreground">{t("invitations")}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{inv.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                        inv.role === "admin"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {inv.role === "admin" ? <Shield className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                        {inv.role === "admin" ? "Admin" : t("teamMember")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {inv.accepted_at ? (
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <Check className="h-3 w-3" /> {t("accepted")}
                    </span>
                  ) : new Date(inv.expires_at) < new Date() ? (
                    <span className="text-xs text-muted-foreground">{t("expired")}</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1 text-xs text-warning font-medium">
                        <Clock className="h-3 w-3" /> {t("pending")}
                      </span>
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        className="rounded p-1 hover:bg-background"
                        title={t("linkCopied")}
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
