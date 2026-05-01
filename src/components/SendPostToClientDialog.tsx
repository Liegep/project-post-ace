import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

interface ClientOption { id: string; name: string; }
interface ColumnOption { id: string; name: string; position: number; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  currentClientId: string;
  onMoved?: () => void;
}

export const SendPostToClientDialog = ({ open, onOpenChange, post, currentClientId, onMoved }: Props) => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [targetClientId, setTargetClientId] = useState<string>("");
  const [targetColumnId, setTargetColumnId] = useState<string>("");
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargetClientId("");
    setTargetColumnId("");
    setColumns([]);
    setMode("copy");
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .neq("id", currentClientId)
        .order("name", { ascending: true });
      setClients(data ?? []);
      setLoading(false);
    })();
  }, [open, currentClientId]);

  useEffect(() => {
    if (!targetClientId) { setColumns([]); setTargetColumnId(""); return; }
    (async () => {
      const { data } = await supabase
        .from("columns")
        .select("id, name, position")
        .eq("client_id", targetClientId)
        .order("position", { ascending: true });
      const cols = data ?? [];
      setColumns(cols);
      setTargetColumnId(cols[0]?.id ?? "");
    })();
  }, [targetClientId]);

  const handleSubmit = async () => {
    if (!targetClientId) { toast.error("Selecione um cliente destino"); return; }
    setSubmitting(true);
    try {
      if (mode === "copy") {
        // Get max position in target column
        const { data: maxData } = await supabase
          .from("posts")
          .select("position")
          .eq("client_id", targetClientId)
          .eq("column_id", targetColumnId || null as any)
          .order("position", { ascending: false })
          .limit(1);
        const nextPos = (maxData?.[0]?.position ?? -1) + 1;

        const { error } = await supabase.from("posts").insert({
          title: post.title,
          image_url: post.imageUrl ?? "",
          media_type: post.mediaType,
          media_urls: post.mediaUrls ?? [],
          caption: post.caption ?? "",
          deadline: post.deadline ? post.deadline.toISOString() : null,
          status: post.status,
          tags: [], // tags são por cliente, não copiar
          client_id: targetClientId,
          column_id: targetColumnId || null,
          position: nextPos,
        } as any);
        if (error) throw error;
        toast.success("Card copiado para o cliente destino");
      } else {
        const { data: maxData } = await supabase
          .from("posts")
          .select("position")
          .eq("client_id", targetClientId)
          .eq("column_id", targetColumnId || null as any)
          .order("position", { ascending: false })
          .limit(1);
        const nextPos = (maxData?.[0]?.position ?? -1) + 1;

        const { error } = await supabase.from("posts").update({
          client_id: targetClientId,
          column_id: targetColumnId || null,
          position: nextPos,
          tags: [],
        } as any).eq("id", post.id);
        if (error) throw error;
        toast.success("Card movido para o cliente destino");
      }
      onOpenChange(false);
      onMoved?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar card");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar card para outro cliente</DialogTitle>
          <DialogDescription>
            Escolha o cliente destino, a coluna e se deseja copiar ou mover o card.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ação</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "copy" | "move")} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="copy" id="mode-copy" />
                <Label htmlFor="mode-copy" className="cursor-pointer font-normal">Copiar (duplicar)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="move" id="mode-move" />
                <Label htmlFor="mode-move" className="cursor-pointer font-normal">Mover (transferir)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Cliente destino</Label>
            <Select value={targetClientId} onValueChange={setTargetClientId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Carregando..." : "Selecione o cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Coluna destino</Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId} disabled={!targetClientId || columns.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={!targetClientId ? "Selecione um cliente primeiro" : columns.length === 0 ? "Sem colunas disponíveis" : "Selecione a coluna"} />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !targetClientId}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {mode === "copy" ? "Copiar" : "Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
