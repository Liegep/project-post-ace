import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TextContentType, TextContentStatus, CONTENT_TYPE_LABELS, TEXT_STATUS_LABELS } from "@/hooks/useTextContents";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfAsHtml, renderPdfAsImagesHtml } from "@/lib/pdfExtract";
import { FileUp, FileText, X, Loader2, Image as ImageIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    content_type: TextContentType;
    title: string;
    subtitle: string;
    body: string;
    status: TextContentStatus;
    planned_date: string | null;
    observations: string;
    pdf_url?: string | null;
    pdf_name?: string | null;
  }) => Promise<boolean>;
  initial?: {
    content_type?: TextContentType;
    title?: string;
    subtitle?: string;
    body?: string;
    status?: TextContentStatus;
    planned_date?: string | null;
    observations?: string;
    pdf_url?: string | null;
    pdf_name?: string | null;
  };
  mode?: "create" | "edit";
}

export function CreateTextContentDialog({ open, onOpenChange, onSave, initial, mode = "create" }: Props) {
  const [contentType, setContentType] = useState<TextContentType>(initial?.content_type || "texto");
  const [title, setTitle] = useState(initial?.title || "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle || "");
  const [body, setBody] = useState(initial?.body || "");
  const [status, setStatus] = useState<TextContentStatus>(initial?.status || "draft");
  const [plannedDate, setPlannedDate] = useState(initial?.planned_date || "");
  const [observations, setObservations] = useState(initial?.observations || "");
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initial?.pdf_url || null);
  const [pdfName, setPdfName] = useState<string | null>(initial?.pdf_name || null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>("");

  const handlePdfFile = async (file: File, mode: "text" | "visual") => {
    if (file.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
      return;
    }
    setPdfBusy(true);
    setPdfProgress(mode === "visual" ? "Renderizando páginas..." : "Extraindo texto...");
    try {
      let html: string;
      if (mode === "visual") {
        html = await renderPdfAsImagesHtml(file, {
          scale: 2,
          onProgress: (c, t) => setPdfProgress(`Renderizando página ${c}/${t}...`),
        });
      } else {
        html = await extractPdfAsHtml(file);
      }
      setBody((prev) => (prev && prev.replace(/<[^>]+>/g, "").trim() ? prev + "\n" + html : html));
      if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));

      // Upload original PDF so the client can download it
      setPdfProgress("Anexando PDF...");
      const path = `text_contents/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      setPdfUrl(pub.publicUrl);
      setPdfName(file.name);
      toast({
        title: "PDF importado",
        description: mode === "visual" ? "Páginas convertidas com layout original e fotos." : "Texto extraído e arquivo anexado.",
      });
    } catch (e: any) {
      toast({ title: "Falha ao importar PDF", description: e.message || String(e), variant: "destructive" });
    } finally {
      setPdfBusy(false);
      setPdfProgress("");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await onSave({
      content_type: contentType,
      title: title.trim(),
      subtitle: subtitle.trim(),
      body,
      status,
      planned_date: plannedDate || null,
      observations: observations.trim(),
      pdf_url: pdfUrl,
      pdf_name: pdfName,
    });
    setSaving(false);
    if (ok) {
      if (mode === "create") {
        setTitle(""); setSubtitle(""); setBody(""); setObservations(""); setPlannedDate("");
        setContentType("texto"); setStatus("draft");
        setPdfUrl(null); setPdfName(null);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{mode === "edit" ? "Editar Conteúdo" : "Novo Conteúdo Textual"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/70">Tipo de Conteúdo</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as TextContentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTENT_TYPE_LABELS) as TextContentType[]).map((k) => (
                    <SelectItem key={k} value={k}>{CONTENT_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/70">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TextContentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEXT_STATUS_LABELS) as TextContentStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{TEXT_STATUS_LABELS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-white/70">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do conteúdo" />
          </div>

          <div>
            <Label className="text-xs text-white/70">Subtítulo / Resumo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Resumo curto do conteúdo" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-white/70">Texto Completo</Label>
              <div className="flex items-center gap-2">
                {pdfName && (
                  <span className="flex items-center gap-1 text-[11px] text-white/80 bg-white/10 rounded px-2 py-0.5">
                    <FileText className="h-3 w-3" /> {pdfName}
                    <button
                      type="button"
                      onClick={() => { setPdfUrl(null); setPdfName(null); }}
                      className="ml-1 hover:text-white"
                      title="Remover PDF"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <label className="inline-flex items-center gap-1 text-[11px] text-white/90 bg-white/10 hover:bg-white/20 rounded px-2 py-1 cursor-pointer">
                  {pdfBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                  {pdfBusy ? "Importando..." : "Importar PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={pdfBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Escreva o conteúdo completo aqui... ou importe um PDF para extrair o texto automaticamente."
            />
            <p className="text-[10px] text-white/50 mt-1">
              Ao importar um PDF, o texto é copiado para o editor e o arquivo fica disponível para o cliente baixar.
            </p>
          </div>


          <div>
            <Label className="text-xs text-white/70">Data Planejada</Label>
            <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs text-white/70">Observações</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas internas ou observações..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/15 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/30 text-white hover:bg-white/10 hover:text-white">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Salvando..." : mode === "edit" ? "Salvar" : "Criar Conteúdo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
