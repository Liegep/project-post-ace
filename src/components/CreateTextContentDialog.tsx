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
import { FileUp, FileText, X, Loader2, Image as ImageIcon, Eye, Send, Download, FileType } from "lucide-react";
import { exportTextContentToPdf, exportTextContentToWord } from "@/lib/textContentExport";

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
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const performSave = async (overrideStatus?: TextContentStatus) => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const finalStatus = overrideStatus ?? status;
    const ok = await onSave({
      content_type: contentType,
      title: title.trim(),
      subtitle: subtitle.trim(),
      body,
      status: finalStatus,
      planned_date: plannedDate || null,
      observations: observations.trim(),
      pdf_url: pdfUrl,
      pdf_name: pdfName,
    });
    setSaving(false);
    if (ok) {
      if (overrideStatus) setStatus(overrideStatus);
      if (mode === "create") {
        setTitle(""); setSubtitle(""); setBody(""); setObservations(""); setPlannedDate("");
        setContentType("texto"); setStatus("draft");
        setPdfUrl(null); setPdfName(null);
      }
      onOpenChange(false);
    }
  };

  const handleSave = () => performSave();
  const handleSendToClient = () => performSave("pending_approval");

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
                <label className="inline-flex items-center gap-1 text-[11px] text-white/90 bg-white/10 hover:bg-white/20 rounded px-2 py-1 cursor-pointer" title="Renderiza cada página como imagem fiel (preserva fontes, layout e fotos)">
                  {pdfBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                  PDF visual
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={pdfBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfFile(f, "visual");
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] text-white/90 bg-white/10 hover:bg-white/20 rounded px-2 py-1 cursor-pointer" title="Extrai apenas o texto editável (sem fotos)">
                  {pdfBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                  PDF texto
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={pdfBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfFile(f, "text");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Escreva o conteúdo aqui... ou importe um PDF (use 'PDF visual' para preservar layout e fotos)."
            />
            <p className="text-[10px] text-white/50 mt-1">
              {pdfBusy && pdfProgress
                ? pdfProgress
                : "PDF visual: páginas viram imagens fiéis (com fotos). PDF texto: extrai apenas texto editável. Em ambos, o arquivo fica disponível para o cliente baixar."}
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

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/15 mt-2">
            <Button onClick={() => onOpenChange(false)} className="bg-white text-black border border-black/10 hover:bg-white/90">Cancelar</Button>
            <Button
              onClick={() => setPreviewOpen(true)}
              className="bg-black text-white hover:bg-black/85"
            >
              <Eye className="mr-2 h-4 w-4" /> Pré-visualizar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await exportTextContentToPdf({
                    id: "preview", client_id: "", content_type: contentType,
                    title: title || "conteudo", subtitle, body, status,
                    planned_date: plannedDate || null, observations,
                    pdf_url: pdfUrl, pdf_name: pdfName,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                  } as any);
                } catch (e: any) {
                  toast({ title: "Erro ao gerar PDF", description: e?.message, variant: "destructive" });
                }
              }}
              className="bg-white text-black border border-black/10 hover:bg-white/90"
            >
              <Download className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exportTextContentToWord({
                id: "preview", client_id: "", content_type: contentType,
                title: title || "conteudo", subtitle, body, status,
                planned_date: plannedDate || null, observations,
                pdf_url: pdfUrl, pdf_name: pdfName,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              } as any)}
              className="bg-white text-black border border-black/10 hover:bg-white/90"
            >
              <FileType className="mr-2 h-4 w-4" /> Baixar Word
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Salvando..." : mode === "edit" ? "Salvar" : "Salvar rascunho"}
            </Button>
            <Button
              onClick={handleSendToClient}
              disabled={saving}
              className="bg-success text-success-foreground hover:bg-success/90"
              title="Salva e envia o conteúdo para aprovação do cliente"
            >
              <Send className="mr-2 h-4 w-4" />
              {saving ? "Enviando..." : "Enviar para cliente"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Preview — what the client will see */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col !bg-white/95 !backdrop-blur-xl !text-black !border-white/30">
          <div className="px-6 pt-6 pb-3 border-b border-black/10">
            <div className="text-[10px] uppercase tracking-wide text-black/60 mb-1">Pré-visualização do cliente</div>
            <h2 className="text-2xl font-bold !text-black leading-tight">{title || "Sem título"}</h2>
            {subtitle && <p className="text-base !text-black/70 mt-1">{subtitle}</p>}
          </div>
          <div className="overflow-y-auto px-6 py-5">
            {pdfUrl && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{pdfName || "Documento PDF"}</span>
                </div>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Baixar PDF
                </a>
              </div>
            )}
            <article
              className="prose prose-sm sm:prose max-w-none leading-[1.8] !text-black [&_*]:!text-black [&_a]:!text-blue-600 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
              dangerouslySetInnerHTML={{ __html: body || "<p><em>Sem conteúdo ainda.</em></p>" }}
            />
            {observations && (
              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações (visíveis para o cliente)</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{observations}</p>
              </div>
            )}
          </div>
          <div className="border-t bg-card px-6 py-3 flex justify-end">
            <Button onClick={() => setPreviewOpen(false)}>Fechar pré-visualização</Button>
          </div>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}
