import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MobileNav } from "@/components/MobileNav";
import { ArrowLeft, Plus, Users, Pencil, Trash2, Shield, UserCheck, Eye, Link2, MoreVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface UserRoleRow {
  user_id: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-600 border-red-200", icon: Shield },
  admin: { label: "Admin", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: UserCheck },
  colaborador: { label: "Colaborador", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Users },
  client: { label: "Cliente", color: "bg-green-500/10 text-green-600 border-green-200", icon: Eye },
};

const TeamManagementPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedNewRole, setSelectedNewRole] = useState<string>("");

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClientIds, setFormClientIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Filter
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, clientsRes, assignmentsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, slug, logo_url").order("name"),
      supabase.from("user_client_assignments").select("user_id, client_id"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setMembers((profilesRes.data as any[]) || []);
    setClients((clientsRes.data as any[]) || []);
    setAssignments((assignmentsRes.data as any[]) || []);
    setUserRoles((rolesRes.data as any[]) || []);
    setLoading(false);
  };

  const getUserRole = (userId: string): string => {
    const found = userRoles.find(r => r.user_id === userId);
    return found?.role || "sem papel";
  };

  // Filter out client-role users - they are managed within each client's page
  const internalMembers = members.filter(m => {
    const role = getUserRole(m.id);
    return role !== "client";
  });

  const filteredMembers = internalMembers.filter(m => {
    if (roleFilter === "all") return true;
    return getUserRole(m.id) === roleFilter;
  });

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

  const openRoleDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setSelectedNewRole(getUserRole(member.id));
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedMember || !selectedNewRole) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user-role", {
        body: {
          target_user_id: selectedMember.id,
          new_role: selectedNewRole,
        },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
        return;
      }
      toast({ title: "Papel atualizado", description: `${selectedMember.full_name} agora é ${ROLE_CONFIG[selectedNewRole]?.label || selectedNewRole}` });
      setRoleDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await supabase.from("user_client_assignments").delete().eq("user_id", selectedMember.id);
      
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
    try {
      const { data, error } = await supabase.functions.invoke("delete-auth-user", {
        body: { user_id: member.id },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
        return;
      }
      fetchAll();
      toast({ title: t("memberDeleted") });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
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

  const RoleBadge = ({ role }: { role: string }) => {
    const config = ROLE_CONFIG[role];
    if (!config) return <Badge variant="outline" className="text-xs">{role}</Badge>;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <MobileNav title="Equipe" />
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
                <Users className="h-5 w-5 md:h-6 md:w-6 shrink-0" /> {t("teamManagement")}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{t("manageTeamMembers")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector />
            <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">{t("newMember")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {/* Role filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { value: "all", label: "Todos" },
            { value: "super_admin", label: "Super Admin" },
            { value: "admin", label: "Admin" },
            { value: "colaborador", label: "Colaborador" },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">
                ({f.value === "all" 
                  ? internalMembers.length 
                  : internalMembers.filter(m => getUserRole(m.id) === f.value).length
                })
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredMembers.length === 0 ? (
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
            {filteredMembers.map(member => {
              const memberClients = getMemberClients(member.id);
              const memberRole = getUserRole(member.id);
              return (
                <div key={member.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{member.full_name}</h3>
                          <RoleBadge role={memberRole} />
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && (
                        <Button variant="outline" size="sm" onClick={() => openRoleDialog(member)}>
                          <Shield className="mr-1 h-3.5 w-3.5" /> Papel
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openAssign(member)}>
                        {memberRole === "client" ? (
                          <><Link2 className="mr-1 h-3.5 w-3.5" /> Vincular ao cliente</>
                        ) : (
                          <><Pencil className="mr-1 h-3.5 w-3.5" /> {t("assignClients")}</>
                        )}
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="outline" size="sm" onClick={() => handleDeleteMember(member)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
                  {memberClients.length === 0 && memberRole !== "super_admin" && (
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

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Alterar Papel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Usuário</p>
              <p className="font-medium text-foreground">{selectedMember?.full_name}</p>
              <p className="text-xs text-muted-foreground">{selectedMember?.email}</p>
            </div>
            <div>
              <Label>Novo papel</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(ROLE_CONFIG).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedNewRole(value)}
                      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        selectedNewRole === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <p>{config.label}</p>
                        <p className="text-xs font-normal text-muted-foreground">
                          {value === "super_admin" && "Acesso total ao sistema"}
                          {value === "admin" && "Gerencia sua carteira de clientes"}
                          {value === "colaborador" && "Trabalha em clientes atribuídos"}
                          {value === "client" && "Acesso ao portal do cliente"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleSaveRole} disabled={saving || !selectedNewRole} className="w-full">
              {saving ? "Salvando..." : "Salvar papel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMember && getUserRole(selectedMember.id) === "client"
                ? `Vincular ${selectedMember?.full_name} ao cliente`
                : `${t("assignClientsTo")} ${selectedMember?.full_name}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMember && getUserRole(selectedMember.id) === "client" ? (
              /* Single client select for client role */
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Usuários com papel "Cliente" podem ser vinculados a apenas 1 cliente.
                </Label>
                <Select
                  value={Array.from(selectedClientIds)[0] || ""}
                  onValueChange={(val) => setSelectedClientIds(new Set(val ? [val] : []))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.logo_url && <img src={c.logo_url} className="h-4 w-4 rounded-full object-contain" alt="" />}
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* Multi-select for admin/colaborador */
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleSelectedClient(c.id)} />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
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
