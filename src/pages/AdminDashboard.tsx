import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";
import { Plus, ImagePlus, ExternalLink, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState<Locale>("pt");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingClient) {
      setSlug(generateSlug(value));
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditingClient(null);
    setName("");
    setSlug("");
    setLocale("pt");
    setLogoPreview("");
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setSlug(client.slug);
    setLocale(client.locale as Locale);
    setLogoPreview(client.logo_url);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !slug) return;
    setSaving(true);
    try {
      let logoUrl = editingClient?.logo_url || "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const fileName = `logos/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(fileName, logoFile);
        if (error) throw error;
        const { data } = supabase.storage.from("media").getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      if (editingClient) {
        await supabase.from("clients").update({
          name,
          slug,
          locale,
          logo_url: logoUrl,
        } as any).eq("id", editingClient.id);
      } else {
        await supabase.from("clients").insert({
          name,
          slug,
          locale,
          logo_url: logoUrl,
        } as any);
      }

      setDialogOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };

  const copyClientUrl = (slug: string) => {
    const url = `${window.location.origin}/client/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ContentFlow</h1>
            <p className="text-sm text-muted-foreground">Selecione ou crie um cliente</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Nenhum cliente ainda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro cliente para começar</p>
            <Button onClick={openCreate} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Criar Cliente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="group relative flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-3">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="h-12 w-12 rounded-lg object-contain border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted">
                      <span className="text-lg font-bold text-muted-foreground">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {LOCALE_FLAGS[client.locale as Locale]} {LOCALE_LABELS[client.locale as Locale]}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{baseUrl}/client/{client.slug}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyClientUrl(client.slug); }}
                    className="ml-auto flex-shrink-0 rounded p-0.5 hover:bg-background"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/${client.slug}`)}
                  >
                    Gerenciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(client)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Empresa XYZ"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            <div>
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/client/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="empresa-xyz"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Idioma do Cliente</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Logo</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              {logoPreview ? (
                <div className="mt-1 flex items-center gap-3">
                  <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-contain border" />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Alterar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-6 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus className="h-5 w-5" />
                  Selecionar logo
                </button>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !name || !slug}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? "..." : editingClient ? "Salvar" : "Criar Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
