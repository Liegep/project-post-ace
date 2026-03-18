import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ArrowLeft, Plus, Users, Pencil, Trash2, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
}

interface Assignment {
  user_id: string;
  client_id: string;
}

const TeamManagementPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClientIds, setFormClientIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, clientsRes, assignmentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "team_member").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, slug, logo_url").order("name"),
      supabase.from("user_client_assignments").select("user_id, client_id"),
    ]);
    setMembers((profilesRes.data as any[]) || []);
    setClients((clientsRes.data as any[]) || []);
    setAssignments((assignmentsRes.data as any[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: formEmail,
          password: formPassword,
          full_name: formName,
          client_ids: Array.from(formClientIds),
        },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Erro ao criar membro", variant: "destructive" });
        return;
      }
      toast({ title: t("teamMemberCreated") });
      setCreateOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormClientIds(new Set());
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openAssign = (member: TeamMember) => {
    setSelectedMember(member);
    const memberAssignments = assignments.filter(a => a.user_id === member.id);
    setSelectedClientIds(new Set(memberAssignments.map(a => a.client_id)));
    setAssignOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      // Delete existing assignments
      await supabase.from("user_client_assignments").delete().eq("user_id", selectedMember.id);
      
      // Insert new assignments
      if (selectedClientIds.size > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const newAssignments = Array.from(selectedClientIds).map(client_id => ({
          user_id: selectedMember.id,
          client_id,
          assigned_by: session?.user?.id || null,
        }));
        await supabase.from("user_client_assignments").insert(newAssignments as any);
      }
      
      toast({ title: t("assignmentsUpdated") });
      setAssignOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!confirm(t("confirmDeleteMember"))) return;
    // We can't delete auth user from client-side, so we just remove profile and assignments
    await supabase.from("user_client_assignments").delete().eq("user_id", member.id);
    await supabase.from("profiles").delete().eq("id", member.id);
    await supabase.from("user_roles").delete().eq("user_id", member.id);
    fetchAll();
    toast({ title: t("memberDeleted") });
  };

  const getMemberClients = (memberId: string) => {
    const memberAssignments = assignments.filter(a => a.user_id === memberId);
    return clients.filter(c => memberAssignments.some(a => a.client_id === c.id));
  };

  const toggleFormClient = (clientId: string) => {
    setFormClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleSelectedClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6" /> {t("teamManagement")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("manageTeamMembers")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newMember")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t("noTeamMembers")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("createFirstMember")}</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newMember")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map(member => {
              const memberClients = getMemberClients(member.id);
              return (
                <div key={member.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{member.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAssign(member)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> {t("assignClients")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteMember(member)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {memberClients.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {memberClients.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {c.logo_url && <img src={c.logo_url} className="h-4 w-4 rounded-full object-contain" alt="" />}
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {memberClients.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{t("noClientsAssigned")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Team Member Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newMember")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("fullName")}</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t("fullNamePlaceholder")} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="membro@empresa.com" />
            </div>
            <div>
              <Label>{t("password")}</Label>
              <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={t("minChars")} />
            </div>
            {clients.length > 0 && (
              <div>
                <Label>{t("assignClients")}</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2 rounded-lg border p-3">
                  {clients.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formClientIds.has(c.id)} onCheckedChange={() => toggleFormClient(c.id)} />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleCreate} disabled={saving || !formName || !formEmail || !formPassword} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? t("saving") : t("createMember")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("assignClientsTo")} {selectedMember?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3">
              {clients.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleSelectedClient(c.id)} />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            <Button onClick={handleSaveAssignments} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagementPage;
