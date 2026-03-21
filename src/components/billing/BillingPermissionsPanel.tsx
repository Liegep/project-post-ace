import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useBillingPermissions,
  upsertBillingPermission,
  deleteBillingPermission,
  useBillingAccessLogs,
  BillingPermission,
} from "@/hooks/useBillingPermissions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck, Eye, Download, FileText, Receipt, Clock,
  Copy, History, User, AlertCircle, CalendarClock
} from "lucide-react";
import { format } from "date-fns";

interface ClientUser {
  user_id: string;
  email: string;
  full_name: string;
}

const ACTION_LABELS: Record<string, string> = {
  view_invoice: "Visualizou fatura",
  download_invoice: "Baixou fatura",
  view_attachment: "Visualizou nota fiscal",
  download_attachment: "Baixou nota fiscal",
};

export function BillingPermissionsPanel({ clientId }: { clientId: string }) {
  const { permissions, loading, refetch } = useBillingPermissions(clientId);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [copySource, setCopySource] = useState<string | null>(null);

  // Load client users
  useEffect(() => {
    const load = async () => {
      setUsersLoading(true);
      const { data: assignments } = await supabase
        .from("user_client_assignments")
        .select("user_id")
        .eq("client_id", clientId);

      if (!assignments?.length) { setUsersLoading(false); return; }

      const userIds = assignments.map((a: any) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      // Filter to only client-role users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const clientUserIds = new Set(
        (roles || []).filter((r: any) => r.role === "client").map((r: any) => r.user_id)
      );

      setUsers(
        (profiles || [])
          .filter((p: any) => clientUserIds.has(p.id))
          .map((p: any) => ({ user_id: p.id, email: p.email, full_name: p.full_name }))
      );
      setUsersLoading(false);
    };
    load();
  }, [clientId]);

  const getPermission = (userId: string) =>
    permissions.find((p) => p.user_id === userId);

  const handleToggle = async (
    userId: string,
    field: keyof Pick<BillingPermission, "can_view_invoices" | "can_download_invoices" | "can_view_attachments" | "can_download_attachments">,
    value: boolean
  ) => {
    setSaving(userId);
    try {
      const existing = getPermission(userId);
      const data = {
        client_id: clientId,
        user_id: userId,
        can_view_invoices: existing?.can_view_invoices || false,
        can_download_invoices: existing?.can_download_invoices || false,
        can_view_attachments: existing?.can_view_attachments || false,
        can_download_attachments: existing?.can_download_attachments || false,
        expires_at: existing?.expires_at || null,
        [field]: value,
      };

      // If disabling view, also disable download
      if (field === "can_view_invoices" && !value) data.can_download_invoices = false;
      if (field === "can_view_attachments" && !value) data.can_download_attachments = false;

      await upsertBillingPermission(data);
      await refetch();
    } catch (err: any) {
      toast({ title: "Erro ao salvar permissão", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleSetExpiry = async (userId: string, expiresAt: string | null) => {
    setSaving(userId);
    try {
      const existing = getPermission(userId);
      await upsertBillingPermission({
        client_id: clientId,
        user_id: userId,
        can_view_invoices: existing?.can_view_invoices || false,
        can_download_invoices: existing?.can_download_invoices || false,
        can_view_attachments: existing?.can_view_attachments || false,
        can_download_attachments: existing?.can_download_attachments || false,
        expires_at: expiresAt || null,
      });
      await refetch();
      toast({ title: expiresAt ? "Expiração definida" : "Expiração removida" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleCopyPermissions = async (fromUserId: string, toUserId: string) => {
    const source = getPermission(fromUserId);
    if (!source) return;
    setSaving(toUserId);
    try {
      await upsertBillingPermission({
        client_id: clientId,
        user_id: toUserId,
        can_view_invoices: source.can_view_invoices,
        can_download_invoices: source.can_download_invoices,
        can_view_attachments: source.can_view_attachments,
        can_download_attachments: source.can_download_attachments,
        expires_at: source.expires_at,
      });
      await refetch();
      toast({ title: "Permissões duplicadas com sucesso" });
      setCopySource(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (usersLoading || loading) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Permissões de Documentos Financeiros</h3>
        </div>
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Permissões de Documentos Financeiros</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4" />
          Nenhum usuário cliente vinculado.
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Permissões de Documentos Financeiros</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLogsOpen(true)} className="text-xs">
          <History className="h-3.5 w-3.5 mr-1" />
          Logs
        </Button>
      </div>

      <div className="space-y-4">
        {users.map((user) => {
          const perm = getPermission(user.user_id);
          const isExpired = perm?.expires_at && new Date(perm.expires_at) < new Date();
          const isSaving = saving === user.user_id;

          return (
            <div key={user.user_id} className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{user.full_name || user.email}</p>
                    {user.full_name && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isExpired && (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                      Expirado
                    </Badge>
                  )}
                  {perm?.expires_at && !isExpired && (
                    <Badge variant="secondary" className="text-[10px]">
                      <CalendarClock className="h-3 w-3 mr-0.5" />
                      Até {format(new Date(perm.expires_at), "dd/MM/yyyy")}
                    </Badge>
                  )}
                  {copySource && copySource !== user.user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6"
                      onClick={() => handleCopyPermissions(copySource, user.user_id)}
                    >
                      Colar aqui
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Copiar permissões"
                    onClick={() => setCopySource(copySource === user.user_id ? null : user.user_id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PermToggle
                  icon={<Eye className="h-3.5 w-3.5" />}
                  label="Ver faturas"
                  checked={!isExpired && (perm?.can_view_invoices || false)}
                  disabled={isSaving}
                  onChange={(v) => handleToggle(user.user_id, "can_view_invoices", v)}
                />
                <PermToggle
                  icon={<Download className="h-3.5 w-3.5" />}
                  label="Baixar faturas"
                  checked={!isExpired && (perm?.can_download_invoices || false)}
                  disabled={isSaving || !(perm?.can_view_invoices)}
                  onChange={(v) => handleToggle(user.user_id, "can_download_invoices", v)}
                />
                <PermToggle
                  icon={<Eye className="h-3.5 w-3.5" />}
                  label="Ver notas fiscais"
                  checked={!isExpired && (perm?.can_view_attachments || false)}
                  disabled={isSaving}
                  onChange={(v) => handleToggle(user.user_id, "can_view_attachments", v)}
                />
                <PermToggle
                  icon={<Download className="h-3.5 w-3.5" />}
                  label="Baixar notas fiscais"
                  checked={!isExpired && (perm?.can_download_attachments || false)}
                  disabled={isSaving || !(perm?.can_view_attachments)}
                  onChange={(v) => handleToggle(user.user_id, "can_download_attachments", v)}
                />
              </div>

              {/* Expiry control */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Expirar em:
                </Label>
                <Input
                  type="date"
                  className="h-7 text-xs flex-1"
                  value={perm?.expires_at ? format(new Date(perm.expires_at), "yyyy-MM-dd") : ""}
                  onChange={(e) => handleSetExpiry(user.user_id, e.target.value || null)}
                />
                {perm?.expires_at && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleSetExpiry(user.user_id, null)}>
                    Remover
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Sheet */}
      <BillingLogsSheet clientId={clientId} open={logsOpen} onOpenChange={setLogsOpen} />
    </div>
  );
}

function PermToggle({
  icon,
  label,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-2.5 py-1.5 bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="scale-75"
      />
    </div>
  );
}

function BillingLogsSheet({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { logs, loading } = useBillingAccessLogs(clientId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logs de Acesso Financeiro
          </SheetTitle>
          <SheetDescription>
            Histórico de visualizações e downloads de documentos financeiros
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-130px)]">
          <div className="p-4 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro ainda.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                    {log.action.includes("download") ? (
                      <Download className="h-4 w-4 text-primary" />
                    ) : (
                      <Eye className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{log.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACTION_LABELS[log.action] || log.action}
                    </p>
                    {log.document_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {log.document_type === "invoice" ? (
                          <Receipt className="h-3 w-3 inline mr-1" />
                        ) : (
                          <FileText className="h-3 w-3 inline mr-1" />
                        )}
                        {log.document_name}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
