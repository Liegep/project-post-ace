import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hash, Plus, Trash2, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface HashtagGroup {
  id: string;
  client_id: string;
  name: string;
  hashtags: string[];
  created_at: string;
}

interface HashtagManagerProps {
  clientId: string;
  onInsert: (hashtags: string) => void;
}

export const HashtagManager = ({ clientId, onInsert }: HashtagManagerProps) => {
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHashtags, setNewHashtags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHashtags, setEditHashtags] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGroups = async () => {
    const { data } = await supabase
      .from("hashtag_groups")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    if (data) setGroups(data as HashtagGroup[]);
  };

  useEffect(() => {
    if (open) fetchGroups();
  }, [open, clientId]);

  const handleCreate = async () => {
    if (!newName.trim() || !newHashtags.trim()) return;
    const hashtags = newHashtags.split(/[\s,]+/).filter(h => h.startsWith("#") || h.length > 0).map(h => h.startsWith("#") ? h : `#${h}`);
    const { error } = await supabase.from("hashtag_groups").insert({
      client_id: clientId,
      name: newName.trim(),
      hashtags,
    });
    if (!error) {
      setNewName("");
      setNewHashtags("");
      setCreating(false);
      fetchGroups();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hashtag_groups").delete().eq("id", id);
    fetchGroups();
  };

  const handleUpdate = async (id: string) => {
    const hashtags = editHashtags.split(/[\s,]+/).filter(h => h.length > 0).map(h => h.startsWith("#") ? h : `#${h}`);
    await supabase.from("hashtag_groups").update({ hashtags }).eq("id", id);
    setEditingId(null);
    fetchGroups();
  };

  const handleInsert = (group: HashtagGroup) => {
    onInsert(group.hashtags.join(" "));
    toast({ title: "Hashtags inseridas", description: `${group.hashtags.length} hashtags do grupo "${group.name}" adicionadas à legenda.` });
  };

  const handleCopy = (group: HashtagGroup) => {
    navigator.clipboard.writeText(group.hashtags.join(" "));
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          Hashtags
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Grupos de Hashtags</Label>
            {!creating && (
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setCreating(true)}>
                <Plus className="h-3 w-3" /> Novo
              </Button>
            )}
          </div>

          {creating && (
            <div className="space-y-2 rounded-lg border p-2">
              <Input
                placeholder="Nome do grupo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="#hashtag1 #hashtag2 ..."
                value={newHashtags}
                onChange={(e) => setNewHashtags(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-1.5">
                <Button type="button" size="sm" className="h-7 flex-1 text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate}>
                  Salvar
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCreating(false); setNewName(""); setNewHashtags(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {groups.length === 0 && !creating && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum grupo salvo. Crie um para reutilizar hashtags rapidamente.
            </p>
          )}

          <div className="max-h-60 space-y-2 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{group.name}</span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(group)}
                    >
                      {copiedId === group.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingId === group.id ? (
                  <div className="space-y-1.5">
                    <Input
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <div className="flex gap-1">
                      <Button type="button" size="sm" className="h-6 flex-1 text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleUpdate(group.id)}>
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors line-clamp-2"
                      onClick={() => { setEditingId(group.id); setEditHashtags(group.hashtags.join(" ")); }}
                      title="Clique para editar"
                    >
                      {group.hashtags.join(" ")}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 w-full text-xs"
                      onClick={() => handleInsert(group)}
                    >
                      Inserir na legenda
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
