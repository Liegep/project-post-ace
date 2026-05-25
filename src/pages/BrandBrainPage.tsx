import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandBrain, VocabularyStatus } from "@/hooks/useBrandBrain";
import { getBbDict } from "@/lib/brandBrainI18n";
import { parseSpreadsheetFile, importVocabularyRows, downloadVocabularyTemplate } from "@/lib/brandVocabularyImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Sparkles, Upload, Download } from "lucide-react";

interface ClientLite { id: string; name: string; logo_url: string; slug: string; locale: string }

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

const STATUS_LABEL: Record<VocabularyStatus, { label: string; className: string }> = {
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  avoid: { label: "Evitar", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  forbidden: { label: "Proibido", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export default function BrandBrainPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [client, setClient] = useState<ClientLite | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("clients").select("id, name, logo_url, slug, locale").eq("slug", slug).maybeSingle().then(({ data }) => {
      setClient((data as ClientLite) || null);
      setLoadingClient(false);
    });
  }, [slug]);

  const canEdit = role === "super_admin" || role === "admin" || role === "colaborador";
  const data = useBrandBrain(client?.id);
  const t = useMemo(() => getBbDict(client?.locale), [client?.locale]);

  if (loadingClient || roleLoading) {
    return <div className="p-10 text-center text-muted-foreground">…</div>;
  }
  if (!client) {
    return <div className="p-10 text-center text-muted-foreground">Cliente não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/client/${slug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {client.logo_url && <img src={client.logo_url} alt="" className="h-12 w-12 rounded-lg border object-contain" />}
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{client.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {t.subtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview">{t.tab_overview}</TabsTrigger>
            <TabsTrigger value="vocabulary">{t.tab_vocabulary}</TabsTrigger>
            <TabsTrigger value="pillars">{t.tab_pillars}</TabsTrigger>
            <TabsTrigger value="voice">{t.tab_voice}</TabsTrigger>
            <TabsTrigger value="avoid">{t.tab_avoid}</TabsTrigger>
            <TabsTrigger value="expressions">{t.tab_expressions}</TabsTrigger>
            <TabsTrigger value="visual">{t.tab_visual}</TabsTrigger>
            {canEdit && <TabsTrigger value="ai">{t.tab_ai}</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          <TabsContent value="vocabulary" className="mt-6">
            <VocabularyTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          <TabsContent value="pillars" className="mt-6">
            <PillarsTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          <TabsContent value="voice" className="mt-6">
            <VoiceTab clientId={client.id} canEdit={canEdit} data={data} />
          </TabsContent>
          <TabsContent value="avoid" className="mt-6">
            <AvoidTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          <TabsContent value="expressions" className="mt-6">
            <ExpressionsTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          <TabsContent value="visual" className="mt-6">
            <VisualTab clientId={client.id} canEdit={canEdit} data={data} t={t} />
          </TabsContent>
          {canEdit && (
            <TabsContent value="ai" className="mt-6">
              <AiPromptsTab clientName={client.name} data={data} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

type DataBundle = ReturnType<typeof useBrandBrain>;
type Dict = ReturnType<typeof getBbDict>;

/* -------------------- Overview -------------------- */
function OverviewTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMission(data.brain?.mission || "");
    setVision(data.brain?.vision || "");
    setSummary(data.brain?.summary || "");
  }, [data.brain]);

  const save = async () => {
    setSaving(true);
    const payload = { client_id: clientId, mission, vision, summary };
    const { error } = data.brain
      ? await supabase.from("brand_brains").update(payload).eq("id", data.brain.id)
      : await supabase.from("brand_brains").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Brand Brain salvo");
    data.refresh();
  };

  const counters = [
    { label: "Vocabulário", value: data.vocabulary.length },
    { label: "Pilares", value: data.pillars.length },
    { label: "Palavras a evitar", value: data.avoid.length },
    { label: "Expressões aprovadas", value: data.expressions.length },
    { label: "Direções visuais", value: data.visuals.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counters.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Identidade da marca</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Missão</Label>
            <Textarea value={mission} onChange={(e) => setMission(e.target.value)} disabled={!canEdit} rows={3} maxLength={1000} />
          </div>
          <div>
            <Label>Visão</Label>
            <Textarea value={vision} onChange={(e) => setVision(e.target.value)} disabled={!canEdit} rows={3} maxLength={1000} />
          </div>
          <div>
            <Label>Resumo estratégico</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!canEdit} rows={5} maxLength={3000} />
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Vocabulary -------------------- */
function VocabularyTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ term: "", category: "keyword", emotion: "", status: "approved" as VocabularyStatus, notes: "" });

  const openNew = () => { setEditing(null); setForm({ term: "", category: "keyword", emotion: "", status: "approved", notes: "" }); setOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setForm(item); setOpen(true); };

  const save = async () => {
    if (!form.term.trim()) return toast.error("Termo é obrigatório");
    const payload = { ...form, client_id: clientId };
    const { error } = editing
      ? await supabase.from("brand_vocabulary").update(payload).eq("id", editing.id)
      : await supabase.from("brand_vocabulary").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false); data.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este termo?")) return;
    const { error } = await supabase.from("brand_vocabulary").delete().eq("id", id);
    if (error) return toast.error(error.message);
    data.refresh();
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo termo</Button>
        </div>
      )}
      {data.vocabulary.length === 0 ? (
        <EmptyState message="Ainda não há vocabulário cadastrado para esta marca." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Emoção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.vocabulary.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.term}</TableCell>
                  <TableCell><Badge variant="secondary">{v.category}</Badge></TableCell>
                  <TableCell>{v.emotion}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_LABEL[v.status]?.className}>{STATUS_LABEL[v.status]?.label || v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{v.notes}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar termo" : "Novo termo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Termo *</Label><Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} maxLength={120} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                    <SelectItem value="concept">Conceito</SelectItem>
                    <SelectItem value="technical">Termo técnico</SelectItem>
                    <SelectItem value="phrase">Frase da marca</SelectItem>
                    <SelectItem value="forbidden">Palavra proibida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VocabularyStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="avoid">Evitar</SelectItem>
                    <SelectItem value="forbidden">Proibido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Emoção associada</Label><Input value={form.emotion} onChange={(e) => setForm({ ...form, emotion: e.target.value })} maxLength={120} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Pillars -------------------- */
function PillarsTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const empty = { name: "", objective: "", themes: "", main_emotion: "", suggested_frequency: "", notes: "" };
  const [form, setForm] = useState(empty);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, objective: p.objective, themes: (p.themes || []).join(", "), main_emotion: p.main_emotion, suggested_frequency: p.suggested_frequency, notes: p.notes });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    const payload = {
      client_id: clientId,
      name: form.name,
      objective: form.objective,
      themes: form.themes.split(",").map((s) => s.trim()).filter(Boolean),
      main_emotion: form.main_emotion,
      suggested_frequency: form.suggested_frequency,
      notes: form.notes,
    };
    const { error } = editing
      ? await supabase.from("content_pillars").update(payload).eq("id", editing.id)
      : await supabase.from("content_pillars").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); data.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este pilar?")) return;
    const { error } = await supabase.from("content_pillars").delete().eq("id", id);
    if (error) return toast.error(error.message);
    data.refresh();
  };

  return (
    <div className="space-y-4">
      {canEdit && <div className="flex justify-end"><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo pilar</Button></div>}
      {data.pillars.length === 0 ? (
        <EmptyState message="Ainda não há pilares de conteúdo cadastrados para esta marca." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.pillars.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.objective && <p><span className="font-medium">Objetivo:</span> {p.objective}</p>}
                {p.main_emotion && <p><span className="font-medium">Emoção:</span> {p.main_emotion}</p>}
                {p.suggested_frequency && <p><span className="font-medium">Frequência:</span> {p.suggested_frequency}</p>}
                {p.themes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.themes.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                {p.notes && <p className="text-muted-foreground pt-2">{p.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar pilar" : "Novo pilar"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></div>
            <div><Label>Objetivo</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} maxLength={500} /></div>
            <div><Label>Temas relacionados (separados por vírgula)</Label><Input value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emoção principal</Label><Input value={form.main_emotion} onChange={(e) => setForm({ ...form, main_emotion: e.target.value })} maxLength={120} /></div>
              <div><Label>Frequência sugerida</Label><Input value={form.suggested_frequency} onChange={(e) => setForm({ ...form, suggested_frequency: e.target.value })} placeholder="ex.: 30%" maxLength={60} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Voice -------------------- */
function VoiceTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [form, setForm] = useState({
    emotional_tone: "", archetype: "", writing_rhythm: "", formality_level: "",
    things_to_avoid: "", good_examples: "", bad_examples: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.voice) {
      setForm({
        emotional_tone: data.voice.emotional_tone,
        archetype: data.voice.archetype,
        writing_rhythm: data.voice.writing_rhythm,
        formality_level: data.voice.formality_level,
        things_to_avoid: data.voice.things_to_avoid,
        good_examples: (data.voice.good_examples || []).join("\n"),
        bad_examples: (data.voice.bad_examples || []).join("\n"),
      });
    }
  }, [data.voice]);

  const save = async () => {
    setSaving(true);
    const payload = {
      client_id: clientId,
      emotional_tone: form.emotional_tone,
      archetype: form.archetype,
      writing_rhythm: form.writing_rhythm,
      formality_level: form.formality_level,
      things_to_avoid: form.things_to_avoid,
      good_examples: form.good_examples.split("\n").map((s) => s.trim()).filter(Boolean),
      bad_examples: form.bad_examples.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const { error } = data.voice
      ? await supabase.from("brand_voice").update(payload).eq("id", data.voice.id)
      : await supabase.from("brand_voice").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Voz da marca salva"); data.refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Tom de voz</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><Label>Tom emocional</Label><Input value={form.emotional_tone} onChange={(e) => setForm({ ...form, emotional_tone: e.target.value })} disabled={!canEdit} /></div>
          <div><Label>Arquétipo da marca</Label><Input value={form.archetype} onChange={(e) => setForm({ ...form, archetype: e.target.value })} disabled={!canEdit} /></div>
          <div><Label>Ritmo de escrita</Label><Input value={form.writing_rhythm} onChange={(e) => setForm({ ...form, writing_rhythm: e.target.value })} disabled={!canEdit} /></div>
          <div><Label>Nível de formalidade</Label><Input value={form.formality_level} onChange={(e) => setForm({ ...form, formality_level: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div><Label>O que a marca deve evitar</Label><Textarea value={form.things_to_avoid} onChange={(e) => setForm({ ...form, things_to_avoid: e.target.value })} disabled={!canEdit} rows={3} /></div>
        <div><Label>Exemplos no tom correto (um por linha)</Label><Textarea value={form.good_examples} onChange={(e) => setForm({ ...form, good_examples: e.target.value })} disabled={!canEdit} rows={4} /></div>
        <div><Label>Exemplos fora do tom (um por linha)</Label><Textarea value={form.bad_examples} onChange={(e) => setForm({ ...form, bad_examples: e.target.value })} disabled={!canEdit} rows={4} /></div>
        {canEdit && <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></div>}
      </CardContent>
    </Card>
  );
}

/* -------------------- Avoid -------------------- */
function AvoidTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const empty = { word: "", reason: "", recommended_alternative: "", category: "" };
  const [form, setForm] = useState(empty);

  const save = async () => {
    if (!form.word.trim()) return toast.error("Palavra é obrigatória");
    const payload = { ...form, client_id: clientId };
    const { error } = editing
      ? await supabase.from("words_to_avoid").update(payload).eq("id", editing.id)
      : await supabase.from("words_to_avoid").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); data.refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    const { error } = await supabase.from("words_to_avoid").delete().eq("id", id);
    if (error) return toast.error(error.message);
    data.refresh();
  };

  return (
    <div className="space-y-4">
      {canEdit && <div className="flex justify-end"><Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Nova palavra</Button></div>}
      {data.avoid.length === 0 ? (
        <EmptyState message="Ainda não há palavras a evitar cadastradas." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evitar</TableHead>
                <TableHead>Usar no lugar</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Motivo</TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.avoid.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium text-red-600 dark:text-red-400">{w.word}</TableCell>
                  <TableCell className="text-emerald-600 dark:text-emerald-400">{w.recommended_alternative}</TableCell>
                  <TableCell>{w.category && <Badge variant="secondary">{w.category}</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{w.reason}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(w); setForm(w); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova palavra a evitar"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Palavra/expressão *</Label><Input value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} maxLength={120} /></div>
            <div><Label>Alternativa recomendada</Label><Input value={form.recommended_alternative} onChange={(e) => setForm({ ...form, recommended_alternative: e.target.value })} maxLength={120} /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} /></div>
            <div><Label>Motivo</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Expressions -------------------- */
function ExpressionsTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const empty = { expression: "", usage_context: "", emotion: "", notes: "" };
  const [form, setForm] = useState(empty);

  const save = async () => {
    if (!form.expression.trim()) return toast.error("Expressão é obrigatória");
    const payload = { ...form, client_id: clientId };
    const { error } = editing
      ? await supabase.from("approved_expressions").update(payload).eq("id", editing.id)
      : await supabase.from("approved_expressions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); data.refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    const { error } = await supabase.from("approved_expressions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    data.refresh();
  };

  return (
    <div className="space-y-4">
      {canEdit && <div className="flex justify-end"><Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Nova expressão</Button></div>}
      {data.expressions.length === 0 ? (
        <EmptyState message="Ainda não há expressões aprovadas cadastradas." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.expressions.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">"{e.expression}"</p>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setForm(e); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
                {e.emotion && <Badge variant="secondary">{e.emotion}</Badge>}
                {e.usage_context && <p className="text-xs text-muted-foreground"><span className="font-medium">Contexto:</span> {e.usage_context}</p>}
                {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova expressão"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Expressão *</Label><Textarea value={form.expression} onChange={(e) => setForm({ ...form, expression: e.target.value })} maxLength={500} /></div>
            <div><Label>Contexto de uso</Label><Input value={form.usage_context} onChange={(e) => setForm({ ...form, usage_context: e.target.value })} maxLength={200} /></div>
            <div><Label>Emoção transmitida</Label><Input value={form.emotion} onChange={(e) => setForm({ ...form, emotion: e.target.value })} maxLength={120} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Visual -------------------- */
function VisualTab({ clientId, canEdit, data }: { clientId: string; canEdit: boolean; data: DataBundle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const empty = { category: "", direction: "", colors: "", image_style: "", lighting: "", composition: "", things_to_avoid: "" };
  const [form, setForm] = useState(empty);

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ ...v, colors: (v.colors || []).join(", ") });
    setOpen(true);
  };

  const save = async () => {
    if (!form.category.trim()) return toast.error("Categoria é obrigatória");
    const payload = {
      client_id: clientId,
      category: form.category,
      direction: form.direction,
      colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
      image_style: form.image_style,
      lighting: form.lighting,
      composition: form.composition,
      things_to_avoid: form.things_to_avoid,
    };
    const { error } = editing
      ? await supabase.from("visual_directions").update(payload).eq("id", editing.id)
      : await supabase.from("visual_directions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); data.refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    const { error } = await supabase.from("visual_directions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    data.refresh();
  };

  return (
    <div className="space-y-4">
      {canEdit && <div className="flex justify-end"><Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Nova direção</Button></div>}
      {data.visuals.length === 0 ? (
        <EmptyState message="Ainda não há direções visuais cadastradas para esta marca." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.visuals.map((v) => (
            <Card key={v.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{v.category}</CardTitle>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {v.direction && <p>{v.direction}</p>}
                {v.colors?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {v.colors.map((c) => (
                      <div key={c} className="flex items-center gap-1.5 text-xs">
                        <span className="h-4 w-4 rounded border" style={{ background: c }} />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
                {v.image_style && <p><span className="font-medium">Estilo:</span> {v.image_style}</p>}
                {v.lighting && <p><span className="font-medium">Iluminação:</span> {v.lighting}</p>}
                {v.composition && <p><span className="font-medium">Composição:</span> {v.composition}</p>}
                {v.things_to_avoid && <p className="text-muted-foreground"><span className="font-medium">Evitar:</span> {v.things_to_avoid}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar direção visual" : "Nova direção visual"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Categoria/tipo de conteúdo *</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={120} /></div>
            <div><Label>Direção visual</Label><Textarea value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} maxLength={500} /></div>
            <div><Label>Cores (hex, separadas por vírgula)</Label><Input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} placeholder="#0d1b2a, #2dd4a8" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estilo de imagem</Label><Input value={form.image_style} onChange={(e) => setForm({ ...form, image_style: e.target.value })} maxLength={200} /></div>
              <div><Label>Iluminação</Label><Input value={form.lighting} onChange={(e) => setForm({ ...form, lighting: e.target.value })} maxLength={200} /></div>
            </div>
            <div><Label>Composição</Label><Input value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} maxLength={200} /></div>
            <div><Label>O que evitar visualmente</Label><Textarea value={form.things_to_avoid} onChange={(e) => setForm({ ...form, things_to_avoid: e.target.value })} maxLength={500} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- AI Prompts -------------------- */
function AiPromptsTab({ clientName, data }: { clientName: string; data: DataBundle }) {
  const [pillarId, setPillarId] = useState<string>("");
  const [contentType, setContentType] = useState("post");
  const [emotion, setEmotion] = useState("");
  const [objective, setObjective] = useState("");
  const [format, setFormat] = useState("legenda");
  const [visualId, setVisualId] = useState<string>("");

  const generated = useMemo(() => {
    const pillar = data.pillars.find((p) => p.id === pillarId);
    const visual = data.visuals.find((v) => v.id === visualId);
    const approvedVocab = data.vocabulary.filter((v) => v.status === "approved").map((v) => v.term);
    const forbidden = [
      ...data.vocabulary.filter((v) => v.status !== "approved").map((v) => v.term),
      ...data.avoid.map((w) => w.word),
    ];
    const tone = data.voice?.emotional_tone || "(tom não definido)";
    const archetype = data.voice?.archetype;
    const expressions = data.expressions.slice(0, 5).map((e) => `"${e.expression}"`);

    const lines: string[] = [];
    lines.push(`Crie ${format === "legenda" ? "uma legenda" : format === "roteiro" ? "um roteiro" : format === "carrossel" ? "um carrossel" : format === "imagem" ? "uma direção de imagem" : format === "arte" ? "uma direção de arte" : format === "campanha" ? "uma campanha" : "um conteúdo"} para a marca ${clientName}.`);
    if (pillar) lines.push(`Pilar de conteúdo: ${pillar.name}${pillar.objective ? ` — ${pillar.objective}` : ""}.`);
    lines.push(`Tipo de conteúdo: ${contentType}.`);
    lines.push(`Tom de voz: ${tone}${archetype ? ` (arquétipo: ${archetype})` : ""}.`);
    if (emotion) lines.push(`Emoção desejada: ${emotion}.`);
    if (objective) lines.push(`Objetivo do post: ${objective}.`);
    if (approvedVocab.length) lines.push(`Use palavras como: ${approvedVocab.slice(0, 15).join(", ")}.`);
    if (forbidden.length) lines.push(`Evite os termos: ${forbidden.slice(0, 15).join(", ")}.`);
    if (expressions.length) lines.push(`Inspire-se em expressões aprovadas: ${expressions.join(", ")}.`);
    if (visual) {
      lines.push(`Direção visual (${visual.category}): ${visual.direction}${visual.image_style ? `, estilo ${visual.image_style}` : ""}${visual.lighting ? `, iluminação ${visual.lighting}` : ""}${visual.composition ? `, composição ${visual.composition}` : ""}.`);
      if (visual.colors?.length) lines.push(`Paleta sugerida: ${visual.colors.join(", ")}.`);
    }
    if (data.voice?.things_to_avoid) lines.push(`Não use: ${data.voice.things_to_avoid}.`);
    return lines.join("\n");
  }, [data, pillarId, contentType, emotion, objective, format, visualId, clientName]);

  const copy = async () => {
    await navigator.clipboard.writeText(generated);
    toast.success("Prompt copiado");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Configurar prompt</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Pilar de conteúdo</Label>
            <Select value={pillarId} onValueChange={setPillarId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {data.pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de conteúdo</Label>
            <Input value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder="ex.: post, reel, story" />
          </div>
          <div>
            <Label>Emoção desejada</Label>
            <Input value={emotion} onChange={(e) => setEmotion(e.target.value)} />
          </div>
          <div>
            <Label>Objetivo do post</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <Label>Formato</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="legenda">Legenda</SelectItem>
                <SelectItem value="roteiro">Roteiro</SelectItem>
                <SelectItem value="arte">Arte</SelectItem>
                <SelectItem value="carrossel">Carrossel</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="campanha">Campanha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Direção visual (opcional)</Label>
            <Select value={visualId} onValueChange={setVisualId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                {data.visuals.map((v) => <SelectItem key={v.id} value={v.id}>{v.category}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prompt gerado</CardTitle>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-2 h-4 w-4" /> Copiar</Button>
        </CardHeader>
        <CardContent>
          <Textarea readOnly value={generated} rows={18} className="font-mono text-xs bg-white text-black" />
        </CardContent>
      </Card>
    </div>
  );
}
