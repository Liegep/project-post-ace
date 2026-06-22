import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickDraft {
  id: string;
  content: string;
  color: string;
  updated_at: string;
}

interface Props {
  clientId: string;
  onCountChange?: (count: number) => void;
}

const COLORS = [
  "#FEF3C7", // amber
  "#FBCFE8", // pink
  "#BFDBFE", // blue
  "#BBF7D0", // green
  "#DDD6FE", // purple
  "#FED7AA", // orange
];

export function QuickDraftNotes({ clientId, onCountChange }: Props) {
  const [drafts, setDrafts] = useState<QuickDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("quick_notes")
      .select("id, content, color, updated_at")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar rascunhos");
    } else {
      setDrafts(data || []);
      onCountChange?.(data?.length || 0);
    }
    setLoading(false);
  }, [clientId, onCountChange]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const color = COLORS[drafts.length % COLORS.length];
    const { data, error } = await supabase
      .from("quick_notes")
      .insert({ client_id: clientId, user_id: user.id, content: "", color })
      .select("id, content, color, updated_at")
      .single();
    if (error || !data) { toast.error("Erro ao criar rascunho"); return; }
    const next = [data, ...drafts];
    setDrafts(next);
    onCountChange?.(next.length);
  };

  const handleUpdate = async (id: string, patch: Partial<QuickDraft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
    setSavingId(id);
    const { error } = await supabase.from("quick_notes").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error("Erro ao salvar");
  };

  const handleDelete = async (id: string) => {
    const prev = drafts;
    const next = drafts.filter(d => d.id !== id);
    setDrafts(next);
    onCountChange?.(next.length);
    const { error } = await supabase.from("quick_notes").delete().eq("id", id);
    if (error) {
      setDrafts(prev);
      onCountChange?.(prev.length);
      toast.error("Erro ao apagar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Novo rascunho
      </button>

      {drafts.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-6">
          Nenhum rascunho ainda. Crie post-its rápidos só para você.
        </p>
      )}

      {drafts.map(draft => (
        <div
          key={draft.id}
          className="relative rounded-lg shadow-sm group"
          style={{ backgroundColor: draft.color }}
        >
          <textarea
            value={draft.content}
            onChange={(e) => setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, content: e.target.value } : d))}
            onBlur={(e) => {
              const original = drafts.find(d => d.id === draft.id);
              if (original && original.content !== e.target.value) {
                handleUpdate(draft.id, { content: e.target.value });
              } else if (original) {
                handleUpdate(draft.id, { content: original.content });
              }
            }}
            placeholder="Escreva aqui..."
            rows={4}
            className="w-full resize-none rounded-lg bg-transparent p-3 pr-8 text-sm text-black placeholder:text-black/40 focus:outline-none"
          />

          {/* Top-right delete */}
          <button
            onClick={() => handleDelete(draft.id)}
            className="absolute top-1.5 right-1.5 rounded p-1 text-black/40 hover:bg-black/10 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Apagar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Color swatches */}
          <div className="flex items-center justify-between gap-1 px-2 pb-2">
            <div className="flex gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => handleUpdate(draft.id, { color: c })}
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border border-black/10 transition-transform hover:scale-110",
                    draft.color === c && "ring-1 ring-black/60"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label="Cor"
                />
              ))}
            </div>
            {savingId === draft.id && (
              <Loader2 className="h-3 w-3 animate-spin text-black/40" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
