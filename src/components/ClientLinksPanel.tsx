import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  Type,
  Pencil,
  Check,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface SortableItemProps {
  link: ClientLink;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

function SectionTitleView({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <Type className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  );
}

function LinkCardView({ link }: { link: ClientLink }) {
  const href = normalizeUrl(link.url);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="group flex items-center gap-3 rounded-lg border p-3 bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer no-underline"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <span className="block text-sm font-medium text-foreground truncate">
          {link.title || href}
        </span>
        <span className="block text-xs text-muted-foreground truncate">{link.url}</span>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}

function SortableItem({ link, onUpdate, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (link.section_title && !link.url) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 pt-4 pb-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Type className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-foreground border-none outline-none focus:ring-0 p-0"
          value={link.section_title}
          onChange={(e) => onUpdate(link.id, "section_title", e.target.value)}
          placeholder="Título da seção"
        />
        <button
          type="button"
          onClick={() => onRemove(link.id)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border p-3 bg-card"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <input
          className="w-full bg-transparent text-sm font-medium text-foreground border-none outline-none focus:ring-0 p-0"
          value={link.title}
          onChange={(e) => onUpdate(link.id, "title", e.target.value)}
          placeholder="Título do link"
        />
        <input
          className="w-full bg-transparent text-xs text-muted-foreground border-none outline-none focus:ring-0 p-0 truncate"
          value={link.url}
          onChange={(e) => onUpdate(link.id, "url", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <a
        href={normalizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary transition-colors"
        title="Abrir em nova aba"
        aria-label="Abrir link em nova aba"
      >
        <ExternalLink className="h-4 w-4" />
      </a>

      <button
        type="button"
        onClick={() => onRemove(link.id)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ClientLinksPanel({ clientId, onCountChange }: Props) {
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchLinks = async () => {
    const { data } = await supabase
      .from("client_links")
      .select("*")
      .eq("client_id", clientId)
      .order("position", { ascending: true });

    const items = (data || []) as ClientLink[];
    setLinks(items);
    onCountChange?.(items.filter((l) => l.url).length);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, [clientId]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(links, oldIndex, newIndex);

      setLinks(reordered);

      const updates = reordered.map((link, i) =>
        supabase.from("client_links").update({ position: i } as any).eq("id", link.id)
      );
      await Promise.all(updates);
    },
    [links]
  );

  const addLink = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const maxPos = links.length > 0 ? Math.max(...links.map((l) => l.position)) + 1 : 0;

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
    const maxPos = links.length > 0 ? Math.max(...links.map((l) => l.position)) + 1 : 0;

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
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
    setAddingSection(false);
    setSectionName("");
    setNewTitle("");
    setNewUrl("");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleEditMode}
          className="h-8 gap-1.5 text-muted-foreground"
        >
          {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editMode ? "Concluir edição" : "Editar links"}
        </Button>
      </div>

      {links.length === 0 && !editMode ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum link adicionado ainda.</p>
      ) : editMode ? (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {links.map((link) => (
                  <SortableItem key={link.id} link={link} onUpdate={updateLink} onRemove={removeLink} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

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
            <Button
              type="button"
              size="sm"
              onClick={addLink}
              disabled={!newTitle.trim() || !newUrl.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar Link
            </Button>
          </div>

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
                <Button type="button" size="sm" variant="outline" onClick={addSection} disabled={!sectionName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingSection(false);
                    setSectionName("");
                  }}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAddingSection(true)}
                className="w-full text-muted-foreground"
              >
                <Type className="h-4 w-4 mr-1" /> Adicionar título de seção
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-1">
          {links.map((link) =>
            link.section_title && !link.url ? (
              <SectionTitleView key={link.id} title={link.section_title} />
            ) : (
              <LinkCardView key={link.id} link={link} />
            )
          )}
        </div>
      )}
    </div>
  );
}
