import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Plus, Trash2, GripVertical, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon_url: string;
  position: number;
}

export function QuickLinksPanel() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const fetchLinks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_quick_links")
      .select("*")
      .eq("user_id", session.user.id)
      .order("position", { ascending: true });

    setLinks((data as QuickLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const { error } = await supabase.from("user_quick_links").insert({
      user_id: session.user.id,
      title: newTitle.trim(),
      url,
      icon_url: getFaviconUrl(url),
      position: links.length,
    });

    if (error) {
      toast({ title: "Erro ao adicionar link", variant: "destructive" });
      return;
    }

    setNewTitle("");
    setNewUrl("");
    setAdding(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_quick_links").delete().eq("id", id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Links Rápidos
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Input
            placeholder="Nome (ex: ChatGPT)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="URL (ex: chat.openai.com)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewTitle(""); setNewUrl(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : links.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum link adicionado ainda.
        </p>
      ) : (
        <div className="space-y-1">
          {links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              {link.icon_url ? (
                <img src={link.icon_url} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
              ) : (
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-foreground truncate hover:text-primary transition-colors"
              >
                {link.title}
              </a>
              <button
                onClick={() => handleDelete(link.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
