import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, ExternalLink, Type } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientLink {
  id: string;
  client_id: string;
  title: string;
  url: string;
  section_title: string;
  position: number;
}

interface Props {
  clientId: string;
  onCountChange?: (count: number) => void;
}

export function ClientLinksPanel({ clientId, onCountChange }: Props) {
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSection, setNewSection] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const fetchLinks = async () => {
    const { data } = await supabase
      .from("client_links")
      .select("*")
      .eq("client_id", clientId)
      .order("position", { ascending: true });
    const items = (data || []) as ClientLink[];
    setLinks(items);
    onCountChange?.(items.filter(l => l.url).length);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, [clientId]);

  const addLink = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const maxPos = links.length > 0 ? Math.max(...links.map(l => l.position)) + 1 : 0;
    await supabase.from("client_links").insert({
      client_id: clientId,
      title: newTitle.trim(),
      url: newUrl.trim(),
      section_title: "",
      position: maxPos,
    } as any);
    setNewTitle("");
    setNewUrl("");
    fetchLinks();
  };

  const addSection = async () => {
    if (!sectionName.trim()) return;
    const maxPos = links.length > 0 ? Math.max(...links.map(l => l.position)) + 1 : 0;
    await supabase.from("client_links").insert({
      client_id: clientId,
      title: "",
      url: "",
      section_title: sectionName.trim(),
      position: maxPos,
    } as any);
    setSectionName("");
    setAddingSection(false);
    fetchLinks();
  };

  const removeLink = async (id: string) => {
    await supabase.from("client_links").delete().eq("id", id);
    fetchLinks();
  };

  const updateLink = async (id: string, field: string, value: string) => {
    await supabase.from("client_links").update({ [field]: value } as any).eq("id", id);
    fetchLinks();
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  // Group links by sections
  const renderItems = () => {
    const elements: JSX.Element[] = [];

    links.forEach((link) => {
      if (link.section_title && !link.url) {
        // Section header
        elements.push(
          <div key={link.id} className="flex items-center gap-2 pt-4 pb-1">
            <Type className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm font-semibold text-foreground border-none outline-none focus:ring-0 p-0"
              value={link.section_title}
              onChange={(e) => updateLink(link.id, "section_title", e.target.value)}
              placeholder="Título da seção"
            />
            <button
              onClick={() => removeLink(link.id)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      } else {
        // Link item
        elements.push(
          <div key={link.id} className="flex items-center gap-2 rounded-lg border p-3 group">
            <div className="flex-1 min-w-0 space-y-1">
              <input
                className="w-full bg-transparent text-sm font-medium border-none outline-none focus:ring-0 p-0"
                value={link.title}
                onChange={(e) => updateLink(link.id, "title", e.target.value)}
                placeholder="Título do link"
              />
              <input
                className="w-full bg-transparent text-xs text-muted-foreground border-none outline-none focus:ring-0 p-0 truncate"
                value={link.url}
                onChange={(e) => updateLink(link.id, "url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            {link.url && (
              <a
                href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => removeLink(link.id)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    });

    return elements;
  };

  return (
    <div className="space-y-3">
      {renderItems()}

      {links.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum link adicionado ainda.</p>
      )}

      {/* Add link form */}
      <div className="space-y-2 pt-2 border-t">
        <p className="text-xs font-medium text-muted-foreground">Adicionar link</p>
        <Input
          placeholder="Título (ex: Instagram)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="URL (ex: https://instagram.com/...)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && addLink()}
        />
        <Button size="sm" onClick={addLink} disabled={!newTitle.trim() || !newUrl.trim()} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Adicionar Link
        </Button>
      </div>

      {/* Add section title */}
      <div className="pt-1">
        {addingSection ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome da seção"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addSection()}
            />
            <Button size="sm" variant="outline" onClick={addSection} disabled={!sectionName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingSection(false); setSectionName(""); }}>
              ✕
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setAddingSection(true)} className="w-full text-muted-foreground">
            <Type className="h-4 w-4 mr-1" /> Adicionar título de seção
          </Button>
        )}
      </div>
    </div>
  );
}
