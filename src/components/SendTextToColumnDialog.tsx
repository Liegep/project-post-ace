import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CONTENT_TYPE_LABELS, type TextContent } from "@/hooks/useTextContents";

interface Column {
  id: string;
  name: string;
  color?: string | null;
  position: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: TextContent | null;
  clientId: string;
}

export function SendTextToColumnDialog({ open, onOpenChange, content, clientId }: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("columns")
        .select("id, name, color, position")
        .eq("client_id", clientId)
        .order("position", { ascending: true });
      setColumns((data as any) || []);
      setLoading(false);
    })();
  }, [open, clientId]);

  const handleSend = async (col: Column) => {
    if (!content) return;
    setSendingId(col.id);
    try {
      const { data: maxPosRow } = await supabase
        .from("posts")
        .select("position")
        .eq("client_id", clientId)
        .eq("column_id", col.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPosition = ((maxPosRow as any)?.position ?? -1) + 1;

      const typeLabel = CONTENT_TYPE_LABELS[content.content_type] || "Texto";
      const titleWithType = `[${typeLabel}] ${content.title}`;

      const { error } = await supabase.from("posts").insert({
        title: titleWithType,
        image_url: "",
        media_type: "image",
        media_urls: [],
        caption: content.body || "",
        status: ["entrada"],
        tags: [],
        client_id: clientId,
        column_id: col.id,
        position: nextPosition,
        art_type: "text",
      } as any);

      if (error) throw error;
      toast({ title: `Card criado em "${col.name}"` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err?.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a coluna</DialogTitle>
          <DialogDescription>Escolha em qual coluna criar o card deste texto.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : columns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma coluna encontrada.</p>
          ) : (
            columns.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSend(col)}
                disabled={sendingId !== null}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 border border-border"
                    style={{ background: col.color || "#94a3b8" }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">{col.name}</span>
                </div>
                {sendingId === col.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Send className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
